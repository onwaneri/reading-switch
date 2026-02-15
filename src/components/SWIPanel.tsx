'use client';

import { useEffect, useState } from 'react';
import type { DepthLevel, SWIAnalysis, WordPosition } from '@/types/book';
import type { ChatMessage, ChatContext } from '@/types/chat';
import { useAudioCache } from '@/hooks/useAudioCache';
import { ChatAssistant } from '@/components/ChatAssistant';

type TabId = 'definition' | 'struct' | 'etymology';

interface SWIPanelProps {
  selectedWord: WordPosition | null;
  analysis: SWIAnalysis | null;
  isLoading: boolean;
  error: string | null;
  depth: DepthLevel;
  onClose: () => void;
  /* bookTitle: string;
  pageText: string;
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;
  chatError: string | null;
  onChatSend: (text: string, context: ChatContext) => void;
  isChatExpanded: boolean;
  onToggleChatExpanded: () => void; */
}

interface SWIPanelProps {
  selectedWord: WordPosition | null;
  analysis: SWIAnalysis | null;
  isLoading: boolean;
  error: string | null;
  depth: DepthLevel;
  onClose: () => void;
}


function WordBreakdownDisplay({
  wordSum,
  bases,
  onColoredBg,
  size = 'default',
}: {
  wordSum: string;
  bases: string[];
  onColoredBg?: boolean;
  size?: 'default' | 'large';
}) {
  const parts = wordSum.split(/\s*\+\s*/);
  const basesLower = bases.map((b) => b.toLowerCase());


  return (
    <div
      className={
        size === 'large'
          ? 'flex items-center flex-wrap gap-0.5 font-bold min-w-0 break-words'
          : 'flex items-center flex-wrap gap-0.5 font-bold min-w-0 break-words'
      }
      style={size === 'large' ? { fontSize: '3em', lineHeight: '1.2' } : { fontSize: '1.25em' }}
    >
      {parts.map((part, i) => {
        const isBase = basesLower.includes(part.toLowerCase());
        return (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && (
              <span
                className={
                  onColoredBg
                    ? 'text-white font-normal mx-0.5'
                    : 'text-[#061B2E] font-normal mx-0.5'
                }
                style={size === 'large' ? { fontSize: '0.7em' } : { fontSize: '0.8em' }}
              >
                +
              </span>
            )}
            <span
              className={
                isBase
                  ? onColoredBg
                    ? 'text-amber-200'
                    : 'text-[#FFC259]'
                  : onColoredBg
                    ? 'text-white'
                    : 'text-[#061B2E]'
              }
            >
              {part}
            </span>
          </span>
        );
      })}
    </div>
  );
}


// Figma: active = solid; inactive = 75% (rgba). Definition #1C85E8, Struct #2CC8A7, Etymology #FF8082
const TABS: {
  id: TabId;
  label: string;
  activeBg: string;
  inactiveBg: string;
  activeText: string;
  inactiveText: string;
}[] = [
  {
    id: 'definition',
    label: 'Definition',
    activeBg: 'bg-[#1C85E8]',
    inactiveBg: 'bg-[#1C85E8]/75',
    activeText: 'text-white',
    inactiveText: 'text-white',
  },
  {
    id: 'struct',
    label: 'Struct',
    activeBg: 'bg-[#2CC8A7]',
    inactiveBg: 'bg-[#2CC8A7]/75',
    activeText: 'text-white',
    inactiveText: 'text-white',
  },
  {
    id: 'etymology',
    label: 'Etymology',
    activeBg: 'bg-[#FF8082]',
    inactiveBg: 'bg-[#FF8082]/75',
    activeText: 'text-white',
    inactiveText: 'text-white',
  },
];


export function SWIPanel({
  selectedWord,
  analysis,
  isLoading,
  error,
  depth,
  onClose,
}: SWIPanelProps) {
  const isOpen = selectedWord !== null;
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const showMatrix = depth === 'standard' || depth === 'deep';
  const showRelatives = depth === 'deep';
  const { isLoading: audioLoading, isReady: audioReady, loadWord, playAudio } =
    useAudioCache();


  // Generate tabs dynamically based on bases
  const tabs = [
    {
      id: 'definition' as TabId,
      label: 'Definition',
      activeBg: 'bg-[#1C85E8]',
      inactiveBg: 'bg-[#1C85E8]/75',
      activeText: 'text-white',
      inactiveText: 'text-white',
    },
    ...(analysis?.matrix.bases.map((base, index) => ({
      id: `struct-${index}` as TabId,
      label: base.text,
      activeBg: 'bg-[#2CC8A7]',
      inactiveBg: 'bg-[#2CC8A7]/75',
      activeText: 'text-white',
      inactiveText: 'text-white',
      baseIndex: index,
    })) || [{
      id: 'struct' as TabId,
      label: 'Base',
      activeBg: 'bg-[#2CC8A7]',
      inactiveBg: 'bg-[#2CC8A7]/75',
      activeText: 'text-white',
      inactiveText: 'text-white',
    }]),
    {
      id: 'etymology' as TabId,
      label: 'Etymology',
      activeBg: 'bg-[#FF8082]',
      inactiveBg: 'bg-[#FF8082]/75',
      activeText: 'text-white',
      inactiveText: 'text-white',
    },
  ];


  useEffect(() => {
    if (selectedWord?.text) {
      loadWord(selectedWord.text);
    }
  }, [selectedWord?.text, loadWord]);


  useEffect(() => {
    if (!selectedWord) setActiveTab(null);
  }, [selectedWord]);

  // Auto-select definition tab when analysis loads
  useEffect(() => {
    if (analysis && !isLoading && !activeTab) {
      setActiveTab('definition');
    }
  }, [analysis, isLoading, activeTab]);


  // Figma SWI Info: padding 39px 31px, gap 10px, align-items center. Margins = tabs bar width (31px).
  const contentMarginX = 'px-[31px]'; // same as panel padding so content aligns with tabs


  return (
    <aside
      className={[
        'fixed top-4 right-4 bottom-4 w-[min(28rem,calc(100vw-2rem))] min-w-[280px] z-50',
        'bg-white rounded-2xl shadow-lg border border-gray-200/80',
        'flex flex-col transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      style={{ containerType: 'inline-size' }}
      aria-label="Word Analysis Panel"
    >
      {/* Base font scales with panel width (Figma 669px = 16px). All child text in em = same ratios, no truncation. */}
      <div
        className="flex flex-col items-center flex-1 min-h-0 w-full"
        style={{ fontSize: 'clamp(10px, 2.392cqi, 16px)' }}
      >
        {/* Frame 49 - Top bar with X button */}
        <div className="flex-shrink-0 w-full flex flex-row justify-end items-center px-[14px] h-[50px]">
          <button
            onClick={onClose}
            className="w-[28px] h-[28px] flex items-center justify-center rounded text-[#061B2E] hover:bg-gray-100 transition"
            aria-label="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px]">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>


        {/* SWI Info */}
        <div className="flex flex-col items-center w-full px-[31px] gap-2.5 flex-1 min-h-0">
          {/* Word heading — Figma: flex row justify-between align-center, padding 4px 25px */}
          <div className="flex-shrink-0 w-full flex flex-row justify-between items-center py-1 px-[25px] min-h-[60px]">
            <div className="flex items-center justify-center min-w-0">
              {analysis && !isLoading ? (
                <WordBreakdownDisplay
                  wordSum={analysis.wordSum}
                  bases={analysis.matrix.bases.map((b) => b.text)}
                  size="large"
                />
              ) : selectedWord ? (
                <p className="font-bold text-[#061B2E] min-w-0 max-w-full break-words" style={{ fontSize: '3em', lineHeight: '1.2' }}>
                  {selectedWord.text}
                </p>
              ) : null}
            </div>
            {/* Volume 2 - TTS button */}
            {selectedWord && (
              <button
                onClick={playAudio}
                disabled={!audioReady}
                className="flex-shrink-0 w-[40px] h-[40px] flex items-center justify-center rounded-full bg-white text-[#061B2E] hover:bg-gray-50 border-[3.5px] border-[#061B2E] disabled:opacity-40 transition ml-4"
                aria-label="Play pronunciation"
                title={audioReady ? 'Play pronunciation' : 'Loading...'}
                style={{ marginLeft: 'auto' }}
              >
                {audioLoading ? (
                  <span className="block w-3 h-3 border-2 border-[#061B2E] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M11.553 3.064A.75.75 0 0112 3.75v16.5a.75.75 0 01-1.255.555L5.46 16H2.75A.75.75 0 012 15.25v-6.5A.75.75 0 012.75 8H5.46l5.285-4.805a.75.75 0 01.808-.131z" />
                  </svg>
                )}
              </button>
            )}
          </div>


        {/* Content — Figma: "Content" container - no gap when tab active, 10px gap when inactive */}
        {selectedWord && (
          <div className={[
            'flex flex-col flex-1 min-h-0 w-full',
            activeTab ? 'gap-0' : 'gap-2.5'
          ].join(' ')}>
            {/* Tabs container: height 44px when active (touches content), 56px when inactive */}
            <div className={[
              'flex flex-row justify-between items-center gap-1.5 flex-shrink-0 bg-white px-0',
              activeTab ? 'h-11 rounded-t-[8px]' : 'h-14 rounded-[8px]'
            ].join(' ')}>
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={[
                    'flex flex-col justify-center items-start flex-1 h-full py-0.5 transition-all duration-300',
                    activeTab === tab.id && `${tab.activeBg} rounded-t-[15px]`,
                  ].filter(Boolean).join(' ')}
                >
                  <button
                    onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                    className={[
                      'w-full h-11 flex items-center justify-center gap-0.5 px-2 rounded-full text-white transition-all duration-300',
                      'font-bold leading-tight break-words text-center',
                      activeTab === tab.id ? tab.activeBg : tab.inactiveBg,
                    ].join(' ')}
                    style={{ fontSize: '1.1em' }}
                  >
                    <span className="min-w-0 break-words">
                      {tab.label}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-[1.2em] h-[1.3em] flex-shrink-0" aria-hidden style={{ minWidth: '1.2em' }}>
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>


            {/* Frame 35 / Info box — Figma: width 535px, border-radius 8px (all) OR 0 0 8px 8px (bottom only when tab active) */}
            <div
              className={[
                'flex-shrink-0 overflow-y-auto transition-colors duration-300 flex',
                !activeTab && 'bg-white flex-row justify-end items-end p-0 rounded-[8px] min-h-[300px]',
                activeTab === 'definition' && 'bg-[#1C85E8] flex-col rounded-b-[8px] min-h-[320px]',
                activeTab?.startsWith('struct') && 'bg-[#2CC8A7] flex-col rounded-b-[8px] min-h-[320px]',
                activeTab === 'etymology' && 'bg-[#FF8082] flex-col rounded-b-[8px] min-h-[320px]',
              ].filter(Boolean).join(' ')}
            >
              {activeTab ? (
                <div className="flex-1 p-5 flex flex-col">
          {isLoading && (
            <div className="flex items-center justify-center flex-1">
              <p className="text-white/90 animate-pulse" style={{ fontSize: '0.875em' }}>Analyzing...</p>
            </div>
          )}


          {error && !isLoading && (
            <p className="text-red-100 break-words" style={{ fontSize: '0.875em' }}>{error}</p>
          )}


          {analysis && !isLoading && (
            <>
              {activeTab === 'definition' && (
                <section className="text-white min-w-0">
                  <p className="font-medium break-words" style={{ fontSize: '1.5em', lineHeight: '1.2' }}>{analysis.definition}</p>
                </section>
              )}


              {activeTab?.startsWith('struct') && (() => {
                const baseIndex = parseInt(activeTab.split('-')[1]) || 0;
                const currentBase = analysis.matrix.bases[baseIndex];
                const hasMultipleBases = analysis.matrix.bases.length > 1;


                return (
                  <section className="flex-1 flex flex-col">
                    {/* Figma Container: 455px × 241px, flex-row with connected borders */}
                    {showMatrix ? (
                      <div className="flex flex-row items-stretch justify-center w-full mt-1">
                        {/* Prefix — only show if single base or if this is the first base */}
                        {!hasMultipleBases && analysis.matrix.prefixes.length > 0 && (
                          <div className="flex flex-col justify-between w-[153px] h-[241px] bg-white border-2 border-[#061B2E] py-2.5 -mr-px">
                            {analysis.matrix.prefixes.flatMap((p, i) => [
                              <span key={`prefix-${i}`} className="font-bold text-[#061B2E] text-center" style={{ fontSize: '1.5em', lineHeight: '29px' }}>
                                {p.text}-
                              </span>,
                              i < analysis.matrix.prefixes.length - 1 && (
                                <div key={`divider-${i}`} className="w-full h-0 border-t-2 border-[#061B2E]" />
                              )
                            ]).filter(Boolean)}
                          </div>
                        )}
                        {/* Base — show only the selected base */}
                        <div className="flex flex-col justify-center items-center w-[151px] h-[241px] bg-white border-2 border-[#061B2E] py-5 px-2.5 -mx-px">
                          <span className="font-bold text-[#FFC259] text-center" style={{ fontSize: '2.25em', lineHeight: '37px' }}>
                            {currentBase?.text}
                          </span>
                          <span className="font-bold text-[#1C85E8] text-center mt-2" style={{ fontSize: '1.25em', lineHeight: '17px' }}>
                            &quot;{currentBase?.meaning ?? ''}&quot;
                          </span>
                        </div>
                        {/* Suffix — only show if single base or if this is the last base */}
                        {!hasMultipleBases && analysis.matrix.suffixes.length > 0 && (
                          <div className="flex flex-col justify-between w-[153px] h-[241px] bg-white border-2 border-[#061B2E] py-2.5 -ml-px">
                            {analysis.matrix.suffixes.flatMap((s, i) => [
                              <span key={`suffix-${i}`} className="font-bold text-[#061B2E] text-center" style={{ fontSize: '1.5em', lineHeight: '29px' }}>
                                -{s.text}
                              </span>,
                              i < analysis.matrix.suffixes.length - 1 && (
                                <div key={`divider-${i}`} className="w-full h-0 border-t-2 border-[#061B2E]" />
                              )
                            ]).filter(Boolean)}
                          </div>
                        )}
                      </div>
                  ) : (
                    <div className="text-white break-words" style={{ fontSize: '0.875em' }}>
                      <WordBreakdownDisplay
                        wordSum={analysis.wordSum}
                        bases={analysis.matrix.bases.map((b) => b.text)}
                        onColoredBg
                      />
                      <p className="mt-2 text-white/90">→ {analysis.word}</p>
                    </div>
                  )}
                </section>
              );
            })()}


              {activeTab === 'etymology' && (
                <section className="text-white min-w-0">
                  <h3 className="font-semibold uppercase text-white/80 mb-2" style={{ fontSize: '0.75em' }}>
                    Word Family
                  </h3>
                  {showRelatives && analysis.relatives.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.relatives.map((r, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-white/25 text-white rounded-full break-all"
                          style={{ fontSize: '1.5em' }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/90 break-words" style={{ fontSize: '1.5em' }}>
                      Word family and etymology are shown at deeper analysis
                      levels. Try &quot;Standard&quot; or &quot;Deep&quot; depth
                      for more.
                    </p>
                  )}
                </section>
              )}
            </>
          )}


          {!analysis && !isLoading && !error && selectedWord && (
            <p className="text-white/90 break-words" style={{ fontSize: '0.875em' }}>Loading analysis...</p>
          )}
                </div>
              ) : (
                /* Empty state - Frame 35: white background with help button at bottom-right */
                <div className="flex-shrink-0 flex justify-end items-end p-[10px]">
                  <button
                    type="button"
                    className="w-[47px] h-[47px] flex items-center justify-center rounded-full bg-[#061B2E] text-white hover:opacity-90 transition font-bold leading-none"
                    style={{ fontSize: '30px' }}
                    aria-label="Help"
                    title="Help"
                  >
                    ?
                  </button>
                </div>
              )}
            </div>


            {/* Help container — Only shown when a tab is active */}
            {activeTab && (
              <div className="flex-shrink-0 flex justify-end items-end p-[10px]">
                <button
                  type="button"
                  className="w-[63px] h-[63px] flex items-center justify-center rounded-full bg-[#061B2E] text-white hover:opacity-90 transition font-bold leading-none"
                  style={{ fontSize: '40px' }}
                  aria-label="Help"
                  title="Help"
                >
                  ?
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </aside>
  );
}
