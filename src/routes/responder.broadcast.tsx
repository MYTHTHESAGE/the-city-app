import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Megaphone, Send, ShieldAlert } from "lucide-react";
import { FormCard, Field, inputClass } from "@/components/onboarding/shell";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/responder/broadcast")({
  beforeLoad: () =>
    requireAuth({ allowedRoles: ["medical_responder", "security_responder", "super_admin"] }),
  head: () => ({ meta: [{ title: "Send Broadcast — The City App" }] }),
  component: SendBroadcast,
});

function SendBroadcast() {
  const navigate = useNavigate();
  const [type, setType] = useState<"health" | "security" | "general">("general");
  const [target, setTarget] = useState("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a message to broadcast.");
      return;
    }

    setSending(true);
    // Simulation of broadcasting alert
    setTimeout(() => {
      setSending(false);
      toast.success("Broadcast alert sent successfully to all target users!");
      setMessage("");
      navigate({ to: "/responder" });
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/responder" })}
          className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Send Broadcast Alert
        </h1>
        <p className="text-xs text-muted-foreground">
          Send a push and SMS notification to residents inside Redemption City.
        </p>
      </div>

      <FormCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Alert Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className={inputClass}
            >
              <option value="general">📢 General Notification</option>
              <option value="health">🔴 Health Emergency Alert</option>
              <option value="security">🟡 Security Warning</option>
            </select>
          </Field>

          <Field label="Target Audience / Area">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={inputClass}
            >
              <option value="all">🌐 All registered users</option>
              <option value="north">Haggai Estates (Northern block)</option>
              <option value="goshen">Goshen Estate</option>
              <option value="central">Redemption Camp Central</option>
              <option value="peripheral">Peripheral Estates ( Goshen, Tree of Life, Covenant)</option>
            </select>
          </Field>

          <Field label="Broadcast Message">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your emergency instructions or advisory here..."
              className={`${inputClass} min-h-[120px] resize-y`}
              maxLength={250}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">
              {250 - message.length} characters remaining
            </p>
          </Field>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="bg-gradient-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-on-primary shadow-elegant disabled:opacity-60"
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </FormCard>

      <div className="glass rounded-2xl border-amber-200/50 bg-amber-50/10 p-4 text-xs dark:border-amber-950/30 dark:bg-amber-950/10 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-foreground">Safety Protocol Notice</p>
          <p className="text-muted-foreground leading-relaxed">
            Broadcast alerts will trigger high-priority push notifications and fallback SMS alerts. Use this form only for critical community updates, weather notices, or safety advisories within Redemption City.
          </p>
        </div>
      </div>
    </div>
  );
}
