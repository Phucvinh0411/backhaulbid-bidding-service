import { WsException } from '@nestjs/websockets';
import { BiddingGateway } from './bidding.gateway';
import { MONITOR_ROOM } from './bidding-events.service';

describe('BiddingGateway realtime auction protocol', () => {
  const registrationService = {
    getAccess: jest.fn(),
  };
  const auctionService = {
    findById: jest.fn(),
  };
  const bidService = {
    place: jest.fn(),
  };
  const eventsService = {
    attachServer: jest.fn(),
    emitBidPlaced: jest.fn(),
  };

  const createSocket = (headers: Record<string, string> = {}) => ({
    handshake: { headers },
    data: {},
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  });

  let gateway: BiddingGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new BiddingGateway(
      registrationService as any,
      auctionService as any,
      bidService as any,
      eventsService as any,
    );
    registrationService.getAccess.mockResolvedValue({
      canEnter: true,
      accessStatus: 'REGISTERED',
    });
  });

  it('joins the authenticated carrier to the auction room', async () => {
    const socket = createSocket({ 'x-user-id': 'carrier-1', 'x-user-role': 'CARRIER' });

    const result = await gateway.joinAuction(socket as any, { auctionId: 'auction-1' });

    expect(socket.join).toHaveBeenCalledWith('auction:auction-1');
    expect(result.data).toMatchObject({
      auctionId: 'auction-1',
      carrierId: 'carrier-1',
      canEnter: true,
    });
  });

  it('rejects joining without an authenticated user', async () => {
    const socket = createSocket({ 'x-user-role': 'CARRIER' });

    await expect(gateway.joinAuction(socket as any, { auctionId: 'auction-1' }))
      .rejects.toBeInstanceOf(WsException);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('leaves only the requested auction room', async () => {
    const socket = createSocket();

    const result = await gateway.leaveAuction(socket as any, { auctionId: 'auction-1' });

    expect(socket.leave).toHaveBeenCalledWith('auction:auction-1');
    expect(result).toEqual({ auctionId: 'auction-1' });
  });

  it('allows an admin to join the monitor room', async () => {
    const socket = createSocket({ 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN' });
    const server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    gateway.server = server as any;

    await gateway.joinMonitor(socket as any);

    expect(socket.join).toHaveBeenCalledWith(MONITOR_ROOM);
    expect(socket.data).toMatchObject({ userId: 'admin-1', role: 'ADMIN' });
  });
});
