import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://backhaulbid:backhaulbid_secret@localhost:27017/backhaulbid_bidding?authSource=admin';

const auctionSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  shipperId: String,
  title: String,
  goodsType: String,
  weight: Number,
  volume: Number,
  goodsValue: mongoose.Schema.Types.Decimal128,
  vehicleTypeRequired: String,
  requiredTemp: String,
  vehicleSpecs: {
    length: Number,
    width: Number,
    height: Number
  },
  origin: String,
  destination: String,
  pickupLocation: {
    province: String,
    address: String,
    contactName: String,
    contactPhone: String,
    timeWindowStart: Date,
    timeWindowEnd: Date,
  },
  deliveryLocation: {
    province: String,
    address: String,
    contactName: String,
    contactPhone: String,
    timeWindowStart: Date,
    timeWindowEnd: Date,
  },
  auctionType: String,
  maxPrice: mongoose.Schema.Types.Decimal128,
  priceStep: mongoose.Schema.Types.Decimal128,
  maxBids: Number,
  images: [String],
  notes: String,
  isDepositRequired: Boolean,
  depositAmount: mongoose.Schema.Types.Decimal128,
  participationFeeTier: String,
  participationFeeAmount: mongoose.Schema.Types.Decimal128,
  registrationEndTime: Date,
  startTime: Date,
  endTime: Date,
  status: String,
  winningBidId: String,
}, { timestamps: true, collection: 'auctions' });

const Auction = mongoose.model('Auction', auctionSchema);

const sampleAuctions = [
  {
    _id: 'LH-2026-9041',
    shipperId: '3b2b78c5-f7ef-441f-ade7-d7754528fedb',
    title: 'Vận chuyển linh kiện điện tử',
    goodsType: 'Linh kiện điện tử Samsung',
    weight: 5.2,
    volume: 28,
    goodsValue: mongoose.Types.Decimal128.fromString('250000000'),
    vehicleTypeRequired: 'Xe tải thùng kín',
    requiredTemp: '25',
    vehicleSpecs: {
      length: 6.5,
      width: 2.2,
      height: 2.4
    },
    origin: 'Thái Nguyên',
    destination: 'Hải Phòng',
    pickupLocation: {
      province: 'Thái Nguyên',
      address: 'Cổng số 3, KCN Yên Bình, Phổ Yên',
      contactName: 'Trần Thế Hải',
      contactPhone: '0912345678',
      timeWindowStart: new Date(Date.now() + 3600000 * 24 * 2), // 2 days from now
      timeWindowEnd: new Date(Date.now() + 3600000 * 24 * 2 + 14400000), // 4 hours window
    },
    deliveryLocation: {
      province: 'Hải Phòng',
      address: 'Cầu cảng số 2, Đông Hải 2, Hải An',
      contactName: 'Phạm Hồng Minh',
      contactPhone: '0904445555',
      timeWindowStart: new Date(Date.now() + 3600000 * 24 * 3), // 3 days from now
      timeWindowEnd: new Date(Date.now() + 3600000 * 24 * 3 + 28800000), // 8 hours window
    },
    auctionType: 'PUBLIC',
    maxPrice: mongoose.Types.Decimal128.fromString('15000000'),
    priceStep: mongoose.Types.Decimal128.fromString('200000'),
    maxBids: 5,
    isDepositRequired: true,
    depositAmount: mongoose.Types.Decimal128.fromString('1500000'),
    participationFeeTier: 'TIER_1',
    participationFeeAmount: mongoose.Types.Decimal128.fromString('50000'),
    registrationEndTime: new Date(Date.now() + 3600000 * 2), // 2 hours from now
    startTime: new Date(Date.now() - 1800000), // Started 30 mins ago
    endTime: new Date(Date.now() + 3600000 * 24), // Ends in 24 hours
    status: 'ACTIVE'
  },
  {
    _id: 'LH-2026-9042',
    shipperId: '3b2b78c5-f7ef-441f-ade7-d7754528fedb',
    title: 'Vận chuyển Nông sản',
    goodsType: 'Nông sản khô (Hạt điều)',
    weight: 15.0,
    volume: 60,
    goodsValue: mongoose.Types.Decimal128.fromString('180000000'),
    vehicleTypeRequired: 'Xe tải thùng bạt',
    requiredTemp: '',
    vehicleSpecs: {
      length: 9.0,
      width: 2.3,
      height: 2.5
    },
    origin: 'Bình Phước',
    destination: 'Bà Rịa - Vũng Tàu',
    pickupLocation: {
      province: 'Bình Phước',
      address: 'Kho xuất khẩu Đồng Phú',
      contactName: 'Nguyen Van A',
      contactPhone: '0988888888',
      timeWindowStart: new Date(Date.now() + 3600000 * 24 * 5),
      timeWindowEnd: new Date(Date.now() + 3600000 * 24 * 5 + 14400000),
    },
    deliveryLocation: {
      province: 'Bà Rịa - Vũng Tàu',
      address: 'Cảng Cái Mép',
      contactName: 'Le Van B',
      contactPhone: '0977777777',
      timeWindowStart: new Date(Date.now() + 3600000 * 24 * 6),
      timeWindowEnd: new Date(Date.now() + 3600000 * 24 * 6 + 28800000),
    },
    auctionType: 'SEALED',
    maxPrice: mongoose.Types.Decimal128.fromString('18500000'),
    priceStep: mongoose.Types.Decimal128.fromString('100000'),
    maxBids: 1,
    isDepositRequired: true,
    depositAmount: mongoose.Types.Decimal128.fromString('1850000'),
    participationFeeTier: 'TIER_1',
    participationFeeAmount: mongoose.Types.Decimal128.fromString('50000'),
    registrationEndTime: new Date(Date.now() + 3600000 * 24),
    startTime: new Date(Date.now() + 3600000 * 25), 
    endTime: new Date(Date.now() + 3600000 * 48), // Ends in 48 hours
    status: 'PENDING'
  },
  {
    _id: 'LH-2026-9043',
    shipperId: '3b2b78c5-f7ef-441f-ade7-d7754528fedb',
    title: 'Vận chuyển Thủy hải sản',
    goodsType: 'Thủy sản đông lạnh',
    weight: 8.5,
    volume: 45,
    goodsValue: mongoose.Types.Decimal128.fromString('400000000'),
    vehicleTypeRequired: 'Xe tải lạnh (Container lạnh)',
    requiredTemp: '-18',
    vehicleSpecs: {
      length: 12.0,
      width: 2.4,
      height: 2.6
    },
    origin: 'Cà Mau',
    destination: 'TP. Hồ Chí Minh',
    pickupLocation: {
      province: 'Cà Mau',
      address: 'KCN Sông Đốc, Trần Văn Thời',
      contactName: 'Lê Văn Tám',
      contactPhone: '0901112223',
      timeWindowStart: new Date(Date.now() + 3600000 * 24 * 1),
      timeWindowEnd: new Date(Date.now() + 3600000 * 24 * 1 + 14400000),
    },
    deliveryLocation: {
      province: 'TP. Hồ Chí Minh',
      address: 'Tổng kho lạnh Thủ Đức',
      contactName: 'Trương Mỹ Lan',
      contactPhone: '0987654321',
      timeWindowStart: new Date(Date.now() + 3600000 * 24 * 2),
      timeWindowEnd: new Date(Date.now() + 3600000 * 24 * 2 + 28800000),
    },
    auctionType: 'PUBLIC',
    maxPrice: mongoose.Types.Decimal128.fromString('28000000'),
    priceStep: mongoose.Types.Decimal128.fromString('500000'),
    maxBids: 10,
    isDepositRequired: true,
    depositAmount: mongoose.Types.Decimal128.fromString('2800000'),
    participationFeeTier: 'TIER_2',
    participationFeeAmount: mongoose.Types.Decimal128.fromString('100000'),
    registrationEndTime: new Date(Date.now() - 3600000 * 2), 
    startTime: new Date(Date.now() - 3600000 * 1), // Started 1h ago
    endTime: new Date(Date.now() + 3600000 * 5), // Ends in 5 hours
    status: 'ACTIVE'
  }
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');
  
  console.log('Clearing old sample auctions...');
  await Auction.deleteMany({ _id: { $in: ['LH-2026-9041', 'LH-2026-9042', 'LH-2026-9043'] } });

  console.log('Inserting new sample data...');
  await Auction.insertMany(sampleAuctions);
  console.log('Successfully seeded sample auctions!');
  
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed', err);
  process.exit(1);
});
