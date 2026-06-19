import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { CityLogo } from "@/components/city-logo";
import { useAuth } from "@/contexts/AuthContext";
import { roleHomePath } from "@/lib/auth-guard";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — The City App" },
      {
        name: "description",
        content: "Sign in to The City App to access rides, vendors and safety across Redemption City.",
      },
    ],
  }),
  component: SignIn,
});

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const { error, role } = await signIn(values.email, values.password);
    if (error) {
      toast.error(error);
      return;
    }
    navigate({ to: roleHomePath(role) });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-hero-radial pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-10 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="block">
            <CityLogo size={56} />
          </Link>
          <p className="mt-6 text-sm text-muted-foreground">
            Welcome back. Sign in to continue.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="glass mt-8 grid gap-4 rounded-3xl p-6 shadow-elegant"
        >
          <label className="block">
            <span className="text-xs font-medium text-foreground/80">Email address</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-medium text-foreground/80">Password</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
            <button
              type="button"
              className="mt-2 text-xs font-medium text-primary transition-opacity hover:opacity-80"
            >
              Forgot password?
            </button>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-primary mt-2 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
          >
            {isSubmitting ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary">
              Sign up
            </Link>
          </p>
        </form>

        <Link
          to="/"
          className="mt-6 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
