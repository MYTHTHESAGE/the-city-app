import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Search, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import heroCity from "@/assets/hero-city.jpg";
import mapPreview from "@/assets/map-preview.jpg";
import arenaImg from "@/assets/landmarks/landmark_arena_1782733331118.png";
import parkImg from "@/assets/landmarks/landmark_park_1782733377030.png";
import fountainImg from "@/assets/landmarks/landmark_fountain_1782733431662.png";
import galleryImg from "@/assets/landmarks/landmark_gallery_1782733811572.png";
import { calculateHaversineDistance } from "@/lib/directions";
import { useAuth } from "@/contexts/AuthContext";
import { roleHomePath } from "@/lib/auth-guard";

const TOURISM_LANDMARKS = [
  { id: "arena", name: "The Arena", image: arenaImg },
  { id: "park", name: "Emmanuel Park", image: parkImg },
  { id: "fountain", name: "Dove Fountain", image: fountainImg },
  { id: "gallery", name: "Open Heavens Gallery", image: galleryImg },
];

export function Hero() {
  const { user, role } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent, directQuery?: string) => {
    e?.preventDefault();
    const searchQuery = directQuery ?? query;
    if (!searchQuery.trim()) return;
    
    if (directQuery) setQuery(directQuery);
    
    setLoading(true);
    setResult(null);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            searchQuery + ", Redemption Camp, Ogun State"
          )}&key=${apiKey}`
        );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const dist = calculateHaversineDistance(
          { lat: userLat, lng: userLng },
          { lat: location.lat, lng: location.lng }
        );
        const time = Math.max(1, Math.round((dist / 30) * 60)); // ~30km/h avg
        setResult(`${dist.toFixed(1)} km away (~${time} min ride) from your location.`);
      } else {
        setResult("Could not find that location in Redemption City.");
      }
    } catch (err) {
      console.error(err);
      setResult("Please enable location services to calculate distance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28">
      {/* atmospheric backdrop */}
      <div className="bg-hero-radial pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-[var(--gradient-aurora)] opacity-30 blur-3xl animate-float-slow sm:h-[520px] sm:w-[520px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 md:grid-cols-2 md:items-center md:gap-12">
        <div className="animate-fade-up">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Built for Redemption City
          </span>
          <h1 className="mt-5 text-[2.1rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Everything you need in{" "}
            <span className="text-gradient">Redemption City</span>,
            <br />
            All in one app.
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            Move across the city, order food from camp vendors, find local
            services and stay safe — all in one beautifully simple app for the
            Redemption City community.
          </p>

          {/* search */}
          <div className="mt-7 flex flex-col gap-2">
            <form onSubmit={handleSearch} className="glass flex items-center gap-2 rounded-2xl p-2 shadow-soft">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-1 items-center gap-2 pl-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="Where in Redemption City? e.g. Auditorium 1"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-primary inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.03] disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Go <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
            {result && (
              <p className="ml-2 text-sm font-medium text-primary animate-fade-up">
                {result}
              </p>
            )}

            {/* Tourism Carousel */}
            <div className="mt-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
              <p className="text-xs font-semibold text-muted-foreground mb-3 pl-1">
                Explore Popular Landmarks
              </p>
              <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
                {TOURISM_LANDMARKS.map((landmark) => (
                  <button
                    key={landmark.id}
                    onClick={() => handleSearch(undefined, landmark.name)}
                    className="group relative flex-shrink-0 w-36 h-24 sm:w-44 sm:h-28 rounded-2xl overflow-hidden snap-start focus:outline-none focus:ring-2 focus:ring-primary shadow-soft"
                  >
                    <img 
                      src={landmark.image} 
                      alt={landmark.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-3">
                      <span className="text-[11px] sm:text-xs font-bold text-white text-left leading-tight drop-shadow-md">
                        {landmark.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* primary CTAs */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {user ? (
              <Link
                to={roleHomePath(role)}
                className="bg-gradient-primary group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.03]"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="bg-gradient-primary group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-on-primary shadow-elegant transition-transform hover:scale-[1.03]"
                >
                  Sign up — get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Sign in
                </Link>
              </>
            )}
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              See how it works
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-success" /> SOS in one tap
            </span>
            <span className="hidden sm:inline">·</span>
            <span>4.9 ★ trust score</span>
            <span className="hidden sm:inline">·</span>
            <span>Camp-wide vendors</span>
          </div>
        </div>

        {/* visual */}
        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="relative overflow-hidden rounded-3xl shadow-elegant">
            <img
              src={heroCity}
              alt="Redemption City at dusk"
              width={1600}
              height={1200}
              className="h-[360px] w-full object-cover sm:h-[460px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent" />

            {/* floating driver card — no vehicle, just driver */}
            <div className="glass absolute bottom-5 left-5 right-5 rounded-2xl p-3 shadow-soft animate-float-slow sm:right-auto sm:w-[78%]">
              <div className="flex items-center gap-3">
                <img
                  src={mapPreview}
                  alt="Map"
                  className="h-16 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-foreground/70">
                    Your driver is arriving
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    Tunde A.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3 min · 0.4 km away
                  </p>
                </div>
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* floating eta chip */}
            <div className="glass absolute right-5 top-5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-soft">
              ETA · 11 min
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
