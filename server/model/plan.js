export const plans = [
  {
    id: "plan_starter",
    name: "Starter",
    maxDevices: 1,
    durationDays: 365,
  },
  {
    id: "plan_business",
    name: "Business",
    maxDevices: 3,
    durationDays: 365,
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    maxDevices: 10,
    durationDays: 365,
  },
];

export function findPlan(planId) {
  return plans.find((plan) => plan.id === planId);
}
