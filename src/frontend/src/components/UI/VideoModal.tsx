import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBJJStore } from '../../store/bjjStore'

export default function VideoModal() {
  const { activeVideo, setActiveVideo } = useBJJStore()

  return (
    <AnimatePresence>
      {activeVideo && (
        <motion.div
          key="video-modal-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setActiveVideo(null)}
        >
          <motion.div
            key="video-modal-content"
            className="relative overflow-hidden rounded-2xl border border-purple-700/40 shadow-2xl"
            style={{ background: '#09091a', width: 'min(800px, 92vw)' }}
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-sm">▶</span>
                <span className="text-sm font-semibold text-white">{activeVideo.title}</span>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="rounded-lg px-2 py-1 text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
                aria-label="Close video"
              >
                ✕
              </button>
            </div>

            {/* YouTube embed — 16:9 aspect ratio */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
