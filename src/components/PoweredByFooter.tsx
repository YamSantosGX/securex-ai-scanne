import discloudLogo from '@/assets/discloud-logo.jpg';

export default function PoweredByFooter() {
  return (
    <div className="w-full py-8 flex justify-center items-center">
      <a 
        href="https://discloud.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all duration-500"
      >
        <img 
          src={discloudLogo} 
          alt="DisCloud Logo" 
          className="w-10 h-10 object-contain"
        />
        <span className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Amaranth', sans-serif", fontWeight: 700 }}>
          Powered by <span className="text-primary">DisCloud</span>
        </span>
      </a>
    </div>
  );
}
