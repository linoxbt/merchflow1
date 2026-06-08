import { createFileRoute } from "@tanstack/react-router";
import { PayPage } from "./pay.$invoiceId";

export const Route = createFileRoute("/p/$invoiceId")({
  head: ({ params }) => ({ meta: [{ title: `Pay ${params.invoiceId} — MerchFlow` }] }),
  component: ShortPayRoute,
});

function ShortPayRoute() {
  const { invoiceId } = Route.useParams();
  return <PayPage invoiceId={invoiceId} />;
}
