import { formatKES } from "./money";
import { formatOrderNo } from "./pricing";

// SMS wording follows the samples in design/screens/Admin-Notifications.dc.html.

type Fulfilment = "delivery" | "pickup";

interface OrderLike {
  orderNo: number;
  total: number;
  fulfilment: Fulfilment;
  paymentMethod: string;
  pickupPointName: string | null;
  customerName: string;
}

const no = (o: { orderNo: number }) => `#${formatOrderNo(o.orderNo)}`;

export function orderReceivedSms(o: OrderLike) {
  const how =
    o.paymentMethod === "cod"
      ? o.fulfilment === "pickup"
        ? `Pay when you pick it up at ${o.pickupPointName ?? "the shop"}.`
        : "Pay when it is delivered."
      : `Total ${formatKES(o.total)}.`;
  return `Asante! Order ${no(o)} received. ${how}`;
}

export function newOrderAdminSms(o: OrderLike) {
  const how = o.fulfilment === "pickup" ? `pickup at ${o.pickupPointName ?? "the shop"}` : "delivery";
  return `New order ${no(o)}: ${o.customerName}, ${formatKES(o.total)}, ${how}.`;
}

export function statusSms(o: OrderLike & { paymentStatus: string }, status: string): string | null {
  switch (status) {
    case "new":
      return `Asante! Order ${no(o)} received. We will start on it soon.`;
    case "preparing":
      return `Order ${no(o)}: we are preparing it now.`;
    case "ready":
      return `Order ${no(o)} is ready at ${o.pickupPointName ?? "the shop"}. See you soon!`;
    case "out_for_delivery":
      return `Order ${no(o)} is out for delivery. Our rider will call when close.`;
    case "completed":
      return `Order ${no(o)} is complete. Thank you for choosing FruityFlavours!`;
    case "cancelled":
      return o.paymentStatus === "paid"
        ? `Order ${no(o)} has been cancelled. We will call you about your refund.`
        : `Order ${no(o)} has been cancelled. You have not been charged.`;
    default:
      return null;
  }
}

export function otpSms(code: string) {
  return `FruityFlavours: your code is ${code}. It expires in 10 minutes. Don't share it with anyone.`;
}

export const OTP_LOG_BODY = "FruityFlavours: your code is ••••••. It expires in 10 minutes.";
