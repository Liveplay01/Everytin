import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

interface PlaceholderProps {
  name: string
  description?: string
}

export default function Placeholder({ name, description }: PlaceholderProps) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-sm"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#F1F3F5] flex items-center justify-center mx-auto mb-4">
          <Construction size={24} className="text-[#9CA3AF]" />
        </div>
        <h2 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">{name}</h2>
        <p className="text-[14px] text-[#6B7280] leading-relaxed">
          {description ?? `${name} is being built. Check back in a future update.`}
        </p>
        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 text-accent-700 rounded-full text-[12px] font-semibold border border-accent-100">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Coming Soon
        </div>
      </motion.div>
    </div>
  )
}
