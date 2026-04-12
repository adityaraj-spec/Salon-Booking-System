export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-10 h-10', lg: 'w-16 h-16' };
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className={`${sizes[size]} border-[3px] border-[#D4AF37]/10 border-t-[#D4AF37] rounded-full animate-spin shadow-sm`} />
      {text && <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">{text}</p>}
    </div>
  );
}
