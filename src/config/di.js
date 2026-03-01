/**
 * Composition Root – Dependency Injection Container
 *
 * Wires infrastructure repositories and services into application use cases.
 * Controllers import named use-case instances from this module.
 *
 * Flow: Controller → UseCase → Repository → Model / DB
 */

// ─── Infrastructure: Repositories ─────────────────────────────────────────────
const UserRepository = require('../infrastructure/repositories/user.repository');
const RestaurantRepository = require('../infrastructure/repositories/restaurant.repository');
const CategoryRepository = require('../infrastructure/repositories/category.repository');
const MenuItemRepository = require('../infrastructure/repositories/menuItem.repository');
const TableRepository = require('../infrastructure/repositories/table.repository');
const OrderRepository = require('../infrastructure/repositories/order.repository');
const NotificationRepository = require('../infrastructure/repositories/notification.repository');
const ActivityLogRepository = require('../infrastructure/repositories/activityLog.repository');
const TransactionLogRepository = require('../infrastructure/repositories/transactionLog.repository');
const CashDrawerRepository = require('../infrastructure/repositories/cashDrawer.repository');
const DailySettlementRepository = require('../infrastructure/repositories/dailySettlement.repository');
const ContactMessageRepository = require('../infrastructure/repositories/contactMessage.repository');
const RestaurantInquiryRepository = require('../infrastructure/repositories/restaurantInquiry.repository');
const CheckoutSessionRepository = require('../infrastructure/repositories/checkoutSession.repository');
const SubscriptionRepository = require('../infrastructure/repositories/subscription.repository');
const SubscriptionPlanRepository = require('../infrastructure/repositories/subscriptionPlan.repository');
const PaymentTransactionRepository = require('../infrastructure/repositories/paymentTransaction.repository');
const PaymentQueueRepository = require('../infrastructure/repositories/paymentQueue.repository');

// ─── Infrastructure: Services ─────────────────────────────────────────────────
const notificationService = require('../infrastructure/services/notification.service');
const paymentQueueService = require('../infrastructure/services/payment-queue.service');

// ─── Application: Use Cases ───────────────────────────────────────────────────
const AuthUseCases = require('../application/useCases/auth.usecases');
const CategoryUseCases = require('../application/useCases/category.usecases');
const MenuItemUseCases = require('../application/useCases/menuItem.usecases');
const TableUseCases = require('../application/useCases/table.usecases');
const OrderUseCases = require('../application/useCases/order.usecases');
const RestaurantUseCases = require('../application/useCases/restaurant.usecases');
const StaffUseCases = require('../application/useCases/staff.usecases');
const AuditUseCases = require('../application/useCases/audit.usecases');
const CashDrawerUseCases = require('../application/useCases/cashDrawer.usecases');
const DashboardUseCases = require('../application/useCases/dashboard.usecases');
const CheckoutUseCases = require('../application/useCases/checkout.usecases');
const ContactUseCases = require('../application/useCases/contact.usecases');
const InquiryUseCases = require('../application/useCases/inquiry.usecases');
const NotificationUseCases = require('../application/useCases/notification.usecases');
const PaymentUseCases = require('../application/useCases/payment.usecases');
const PaymentQueueUseCases = require('../application/useCases/paymentQueue.usecases');
const SubscriptionUseCases = require('../application/useCases/subscription.usecases');
const SuperadminUseCases = require('../application/useCases/superadmin.usecases');

// ─── Instantiate Repositories ─────────────────────────────────────────────────
const userRepository = new UserRepository();
const restaurantRepository = new RestaurantRepository();
const categoryRepository = new CategoryRepository();
const menuItemRepository = new MenuItemRepository();
const tableRepository = new TableRepository();
const orderRepository = new OrderRepository();
const notificationRepository = new NotificationRepository();
const activityLogRepository = new ActivityLogRepository();
const transactionLogRepository = new TransactionLogRepository();
const cashDrawerRepository = new CashDrawerRepository();
const dailySettlementRepository = new DailySettlementRepository();
const contactMessageRepository = new ContactMessageRepository();
const restaurantInquiryRepository = new RestaurantInquiryRepository();
const checkoutSessionRepository = new CheckoutSessionRepository();
const subscriptionRepository = new SubscriptionRepository();
const subscriptionPlanRepository = new SubscriptionPlanRepository();
const paymentTransactionRepository = new PaymentTransactionRepository();
const paymentQueueRepository = new PaymentQueueRepository();

// ─── Instantiate Use Cases (inject dependencies) ─────────────────────────────
const authUseCases = new AuthUseCases({
  userRepository,
  restaurantRepository,
  activityLogRepository,
  notificationService,
});

const categoryUseCases = new CategoryUseCases({
  categoryRepository,
  menuItemRepository,
});

const menuItemUseCases = new MenuItemUseCases({
  menuItemRepository,
  categoryRepository,
});

const tableUseCases = new TableUseCases({
  tableRepository,
});

const orderUseCases = new OrderUseCases({
  orderRepository,
  tableRepository,
  menuItemRepository,
  notificationService,
});

const restaurantUseCases = new RestaurantUseCases({
  restaurantRepository,
  userRepository,
  activityLogRepository,
});

const staffUseCases = new StaffUseCases({
  userRepository,
  activityLogRepository,
});

const auditUseCases = new AuditUseCases({
  transactionLogRepository,
  dailySettlementRepository,
  orderRepository,
});

const cashDrawerUseCases = new CashDrawerUseCases({
  cashDrawerRepository,
  orderRepository,
  transactionLogRepository,
});

const dashboardUseCases = new DashboardUseCases({
  orderRepository,
  menuItemRepository,
  tableRepository,
});

const checkoutUseCases = new CheckoutUseCases({
  checkoutSessionRepository,
  subscriptionPlanRepository,
  restaurantRepository,
  userRepository,
  subscriptionRepository,
  notificationService,
});

const contactUseCases = new ContactUseCases({
  contactMessageRepository,
  restaurantRepository,
  userRepository,
  notificationService,
});

const inquiryUseCases = new InquiryUseCases({
  restaurantInquiryRepository,
  restaurantRepository,
  userRepository,
  notificationService,
});

const notificationUseCases = new NotificationUseCases({
  notificationRepository,
});

const paymentUseCases = new PaymentUseCases({
  orderRepository,
  tableRepository,
  notificationService,
});

const paymentQueueUseCases = new PaymentQueueUseCases({
  paymentQueueRepository,
  paymentQueueService,
  auditUseCases,
});

const subscriptionUseCases = new SubscriptionUseCases({
  subscriptionPlanRepository,
  subscriptionRepository,
  paymentTransactionRepository,
  restaurantRepository,
});

const superadminUseCases = new SuperadminUseCases({
  restaurantRepository,
  userRepository,
  orderRepository,
  menuItemRepository,
  tableRepository,
  subscriptionRepository,
  activityLogRepository,
  transactionLogRepository,
});

// ─── Export all use-case singletons ───────────────────────────────────────────
module.exports = {
  // Use Cases
  authUseCases,
  categoryUseCases,
  menuItemUseCases,
  tableUseCases,
  orderUseCases,
  restaurantUseCases,
  staffUseCases,
  auditUseCases,
  cashDrawerUseCases,
  dashboardUseCases,
  checkoutUseCases,
  contactUseCases,
  inquiryUseCases,
  notificationUseCases,
  paymentUseCases,
  paymentQueueUseCases,
  subscriptionUseCases,
  superadminUseCases,
};
