import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Star, Send } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { fetchVendorById } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/ratings")({
  beforeLoad: () => requireAuth({ allowedRoles: ["vendor", "super_admin"] }),
  head: () => ({ meta: [{ title: "Ratings & Reviews — The City App" }] }),
  component: VendorRatings,
});

type Review = {
  id: string;
  customerName: string;
  rating: number;
  date: string;
  comment: string;
  reply?: string;
};

const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    customerName: "Adaeze Okafor",
    rating: 5,
    date: "2 hours ago",
    comment: "The Jollof Rice was hot and delicious! Delivery Keke arrived in under 8 minutes as promised. Excellent service.",
  },
  {
    id: "rev-2",
    customerName: "Brother Tunde",
    rating: 4,
    date: "1 day ago",
    comment: "Great food from RCCG City Kitchen, but they forgot to add extra plantains. The driver was polite though.",
  },
  {
    id: "rev-3",
    customerName: "Sister Ngozi",
    rating: 5,
    date: "3 days ago",
    comment: "Always the best soup in camp! Clean packaging and high quality.",
    reply: "Thank you for the support, Sister Ngozi! We aim to please always.",
  },
];

function VendorRatings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: () => fetchVendorById(user!.id),
    enabled: !!user,
  });

  const handleSendReply = (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text?.trim()) return;

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, reply: text } : r))
    );
    setReplyText((prev) => ({ ...prev, [reviewId]: "" }));
    setActiveReplyId(null);
    toast.success("Reply submitted successfully!");
  };

  const ratingVal = vendor?.rating != null ? Number(vendor.rating) : 4.8;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/vendor" })}
          className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Ratings & Reviews
        </h1>
        <p className="text-xs text-muted-foreground">
          See customer feedback, star ratings, and reply to reviews.
        </p>
      </div>

      {/* Overview Card */}
      <section className="glass rounded-3xl p-5 shadow-soft grid grid-cols-3 gap-4 items-center">
        <div className="text-center border-r border-border/60">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Average Rating</p>
          <p className="text-3xl font-extrabold text-foreground mt-1 flex items-center justify-center gap-1">
            {ratingVal.toFixed(1)}
            <Star className="h-5 w-5 fill-[#FFD66B] text-[#FFD66B]" />
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Out of 5 stars</p>
        </div>
        <div className="col-span-2 space-y-1.5 pl-2">
          <RatingBar star={5} percent={85} />
          <RatingBar star={4} percent={10} />
          <RatingBar star={3} percent={5} />
          <RatingBar star={2} percent={0} />
          <RatingBar star={1} percent={0} />
        </div>
      </section>

      {/* Reviews List */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Customer reviews ({reviews.length})
        </h2>

        <ul className="space-y-3">
          {reviews.map((r) => {
            const isReplying = activeReplyId === r.id;

            return (
              <li key={r.id} className="glass rounded-2xl p-4 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">{r.customerName}</span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < r.rating ? "fill-[#FFD66B] text-[#FFD66B]" : "text-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{r.date}</span>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed">"{r.comment}"</p>

                {/* Owner Reply */}
                {r.reply && (
                  <div className="rounded-xl bg-secondary/60 p-3 text-xs border-l-2 border-primary/50">
                    <p className="font-semibold text-foreground text-[10px] uppercase tracking-wider">
                      Your Response
                    </p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">"{r.reply}"</p>
                  </div>
                )}

                {/* Reply controls */}
                {!r.reply && !isReplying && (
                  <button
                    onClick={() => setActiveReplyId(r.id)}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Reply to review
                  </button>
                )}

                {isReplying && (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={replyText[r.id] ?? ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="Type your response to this customer..."
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setActiveReplyId(null);
                          setReplyText((prev) => ({ ...prev, [r.id]: "" }));
                        }}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSendReply(r.id)}
                        className="bg-gradient-primary inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-[10px] font-bold text-on-primary shadow-soft"
                      >
                        <Send className="h-2.5 w-2.5" /> Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function RatingBar({ star, percent }: { star: number; percent: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-3 text-muted-foreground text-right">{star}</span>
      <Star className="h-2.5 w-2.5 text-muted-foreground fill-muted-foreground" />
      <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-[#FFD66B] rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-6 text-muted-foreground text-right">{percent}%</span>
    </div>
  );
}
