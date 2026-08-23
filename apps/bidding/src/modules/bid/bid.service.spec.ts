import { ConflictException } from '@nestjs/common';
import { BidService } from './bid.service';
import { AuctionStatus } from '../../common/enums/auction-status.enum';

describe('BidService (Bidding Rules)', () => {
  let service: BidService;
  let mockBidModel: any;
  let mockAuctionService: any;
  let mockRegistrationService: any;

  beforeEach(() => {
    mockBidModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
    };
    mockAuctionService = {
      findById: jest.fn(),
    };
    mockRegistrationService = {
      getAccess: jest.fn().mockResolvedValue({ canEnter: true }),
    };

    service = new BidService(
      mockBidModel,
      mockAuctionService,
      mockRegistrationService,
    );
  });

  it('should reject bid if auction has reached maxBids limit', async () => {
    mockAuctionService.findById.mockResolvedValue({
      status: AuctionStatus.OPEN,
      roomOpen: true,
      maxPrice: '10000000',
      priceStep: '500000',
      maxBids: 5,
    });

    mockBidModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(5),
    });

    await expect(
      service.place('auction-1', 'carrier-1', { bidAmount: '9000000' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject bid if it does not improve lowest bid by priceStep', async () => {
    mockAuctionService.findById.mockResolvedValue({
      status: AuctionStatus.OPEN,
      roomOpen: true,
      maxPrice: '10000000',
      priceStep: '500000',
      maxBids: null,
    });

    mockBidModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          bidAmount: { toString: () => '9000000' },
        }),
      }),
    });

    // 9,000,000 - 500,000 = 8,500,000 is maximum allowed new bid. 8,600,000 is not low enough.
    await expect(
      service.place('auction-1', 'carrier-1', { bidAmount: '8600000' }),
    ).rejects.toThrow(ConflictException);
  });

  it('enforces maxBids per carrier when two bids arrive concurrently', async () => {
    let storedBidCount = 0;
    let currentLowest: string | null = null;
    mockAuctionService.findById.mockResolvedValue({
      status: AuctionStatus.OPEN,
      roomOpen: true,
      maxPrice: '10000000',
      priceStep: '100000',
      maxBids: 1,
    });
    mockBidModel.countDocuments.mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(storedBidCount),
    }));
    mockBidModel.findOne.mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          currentLowest
            ? { bidAmount: { toString: () => currentLowest } }
            : null,
        ),
      }),
    }));
    mockBidModel.create.mockImplementation((data: any) => {
      storedBidCount += 1;
      currentLowest = data.bidAmount.toString();
      return Promise.resolve({
        _id: `bid-${storedBidCount}`,
        ...data,
        bidAmount: data.bidAmount,
      });
    });

    const results = await Promise.allSettled([
      service.place('auction-1', 'carrier-1', { bidAmount: '9000000' }),
      service.place('auction-1', 'carrier-1', { bidAmount: '8000000' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(mockBidModel.create).toHaveBeenCalledTimes(1);
  });

  it('returns an existing bid for a repeated idempotency key', async () => {
    const existing = {
      _id: 'bid-existing',
      bidAmount: { toString: () => '9000000' },
      bidTime: new Date(),
      idempotencyKey: 'request-123',
    };
    mockBidModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existing),
    });

    const result = await service.place('auction-1', 'carrier-1', {
      bidAmount: '9000000',
      idempotencyKey: 'request-123',
    });

    expect(result.id).toBe('bid-existing');
    expect(mockAuctionService.findById).not.toHaveBeenCalled();
    expect(mockBidModel.create).not.toHaveBeenCalled();
  });

  it('only returns the carrier own bids for a sealed auction', async () => {
    const ownBid = {
      _id: 'bid-own',
      auctionId: 'auction-sealed',
      carrierId: 'carrier-1',
      bidAmount: { toString: () => '8000000' },
      bidTime: new Date(),
      idempotencyKey: null,
    };
    mockAuctionService.findById.mockResolvedValue({
      auctionType: 'SEALED',
      maxBids: 5,
    });
    mockBidModel.countDocuments.mockImplementation((filter: any) => ({
      exec: jest.fn().mockResolvedValue(filter.carrierId ? 2 : 2),
    }));
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([ownBid]),
    };
    mockBidModel.find.mockReturnValue(chain);

    const result = await service.list(
      'auction-sealed',
      'carrier-1',
      'CARRIER',
      { page: 1, pageSize: 20, sortOrder: 'asc' },
    );

    expect(mockBidModel.find).toHaveBeenCalledWith({
      auctionId: 'auction-sealed',
      carrierId: 'carrier-1',
    });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.remainingBids).toBe(3);
  });

  it('accepts independent sealed bids without comparing against another carrier', async () => {
    mockAuctionService.findById.mockResolvedValue({
      auctionType: 'SEALED',
      status: AuctionStatus.OPEN,
      roomOpen: true,
      maxPrice: '10000000',
      maxBids: 2,
    });
    mockBidModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });
    mockBidModel.create.mockResolvedValue({
      _id: 'bid-sealed',
      auctionId: 'auction-sealed',
      carrierId: 'carrier-2',
      bidAmount: { toString: () => '9500000' },
      bidTime: new Date(),
      idempotencyKey: null,
    });

    await expect(
      service.place('auction-sealed', 'carrier-2', { bidAmount: '9500000' }),
    ).resolves.toMatchObject({ id: 'bid-sealed' });
    expect(mockBidModel.findOne).not.toHaveBeenCalled();
  });
});
