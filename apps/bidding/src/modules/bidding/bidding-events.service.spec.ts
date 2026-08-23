import { BiddingEventsService, MONITOR_ROOM } from './bidding-events.service';
import { AuctionType } from '../../common/enums/auction-type.enum';

describe('BiddingEventsService', () => {
  let service: BiddingEventsService;
  let emitMock: jest.Mock;
  let toMock: jest.Mock;

  const attachMockServer = () => {
    emitMock = jest.fn();
    toMock = jest.fn().mockReturnValue({ emit: emitMock });
    service.attachServer({ to: toMock } as any);
  };

  beforeEach(() => {
    service = new BiddingEventsService();
  });

  it('no-ops when no server is attached', () => {
    expect(() =>
      service.emitBidPlaced(
        'auction-1',
        {
          id: 'bid-1',
          auctionId: 'auction-1',
          carrierId: 'carrier-1',
          bidAmount: '5000000',
          bidTime: new Date(),
        },
        AuctionType.PUBLIC,
      ),
    ).not.toThrow();
    expect(() =>
      service.emitAuctionStatusChanged({
        auctionId: 'auction-1',
        status: 'OPEN',
        roomOpen: true,
        endTime: new Date(),
      }),
    ).not.toThrow();
  });

  it('broadcasts public bid payload to auction room and monitor room', () => {
    attachMockServer();
    const bid = {
      id: 'bid-1',
      auctionId: 'auction-1',
      carrierId: 'carrier-1',
      bidAmount: '5000000',
      bidTime: new Date(),
    };

    service.emitBidPlaced('auction-1', bid, AuctionType.PUBLIC);

    expect(toMock).toHaveBeenCalledWith('auction:auction-1');
    expect(toMock).toHaveBeenCalledWith(MONITOR_ROOM);
    expect(emitMock).toHaveBeenCalledTimes(2);
    expect(emitMock).toHaveBeenCalledWith('bidPlaced', {
      auctionId: 'auction-1',
      bid,
    });
  });

  it('hides bid details for sealed auctions', () => {
    attachMockServer();
    const bid = {
      id: 'bid-2',
      auctionId: 'auction-2',
      carrierId: 'carrier-2',
      bidAmount: '4000000',
      bidTime: new Date(),
    };

    service.emitBidPlaced('auction-2', bid, AuctionType.SEALED);

    expect(emitMock).toHaveBeenCalledWith('bidPlaced', {
      auctionId: 'auction-2',
      sealed: true,
    });
    const [, payload] = emitMock.mock.calls[0];
    expect(payload.bid).toBeUndefined();
  });

  it('broadcasts auction status changes to both rooms', () => {
    attachMockServer();
    const endTime = new Date();

    service.emitAuctionStatusChanged({
      auctionId: 'auction-3',
      status: 'COMPLETED',
      roomOpen: false,
      endTime,
      winningBidAmount: '3500000',
    });

    expect(toMock).toHaveBeenCalledWith('auction:auction-3');
    expect(toMock).toHaveBeenCalledWith(MONITOR_ROOM);
    expect(emitMock).toHaveBeenCalledWith('auctionStatusChanged', {
      auctionId: 'auction-3',
      status: 'COMPLETED',
      roomOpen: false,
      endTime,
      winningBidAmount: '3500000',
    });
  });
});