import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerOrdersRealtime } from "@/hooks/use-customer-orders-realtime";

export const Route = createFileRoute("/dashboard/food")({
  component: FoodLayout,
});

function FoodLayout() {
  const { user } = useAuth();
  useCustomerOrdersRealtime(user?.id);
  return <Outlet />;
}
