import { DemoStrip } from "@/components/DemoStrip";

/** Cart, payment and confirmation: each page draws its own header, as in the design. No footer. */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoStrip />
      {children}
    </>
  );
}
