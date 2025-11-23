export default function PoweredByFooter() {
  return (
    <div className="w-full py-8 flex justify-center items-center">
      <a 
        href="https://discloud.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all duration-300"
      >
        <svg 
          viewBox="0 0 40 40" 
          className="w-8 h-8"
          fill="none"
        >
          <path 
            d="M5 15C5 10 8 5 15 5L25 5C32 5 35 10 35 15L35 25C35 32 32 35 25 35L15 35C8 35 5 32 5 25L5 15Z" 
            fill="hsl(var(--primary))"
          />
          <path 
            d="M12 12L18 18L12 24M20 20L28 20" 
            stroke="hsl(var(--background))" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-lg font-semibold text-foreground">
          Powered by <span className="text-primary">DisCloud</span>
        </span>
      </a>
    </div>
  );
}
