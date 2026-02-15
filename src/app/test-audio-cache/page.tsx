/**
 * Interactive test page for audio cache system
 * Access at: http://localhost:3000/test-audio-cache
 */

'use client';

import { useState } from 'react';
import { useAudioCache } from '@/hooks/useAudioCache';

export default function TestAudioCachePage() {
  const {
    selectedWord,
    isLoading,
    isReady,
    error,
    loadWord,
    playAudio,
    clearCache,
    cacheSize,
  } = useAudioCache();

  const [testLog, setTestLog] = useState<string[]>([]);
  const [autoTestRunning, setAutoTestRunning] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Manual test: Single word
  const testSingleWord = async (word: string) => {
    addLog(`Testing word: "${word}"`);
    const start = performance.now();

    try {
      await loadWord(word);
      const duration = performance.now() - start;
      addLog(`✓ Loaded "${word}" in ${duration.toFixed(0)}ms`);
    } catch (err) {
      addLog(`✗ Failed to load "${word}": ${err}`);
    }
  };

  // Automated test sequence
  const runAutomatedTest = async () => {
    setAutoTestRunning(true);
    setTestLog([]);
    addLog('🚀 Starting automated test...');

    const testSequence = [
      { word: 'hello', expectedCached: false },
      { word: 'world', expectedCached: false },
      { word: 'hello', expectedCached: true }, // Should be cached
      { word: 'construction', expectedCached: false },
      { word: 'world', expectedCached: true }, // Should be cached
    ];

    for (const test of testSequence) {
      addLog(`\nTest: "${test.word}" (expect ${test.expectedCached ? 'CACHED' : 'NEW'})`);
      const start = performance.now();

      try {
        await loadWord(test.word);
        const duration = performance.now() - start;

        // Check if timing matches expectation
        const wasCached = duration < 100; // Cached loads are <100ms
        const matchesExpectation = wasCached === test.expectedCached;

        if (matchesExpectation) {
          addLog(`✓ PASS: ${wasCached ? 'Cached' : 'Generated'} in ${duration.toFixed(0)}ms`);
        } else {
          addLog(`⚠ UNEXPECTED: Expected ${test.expectedCached ? 'cached' : 'new'} but got ${wasCached ? 'cached' : 'new'} (${duration.toFixed(0)}ms)`);
        }

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        addLog(`✗ FAIL: ${err}`);
      }
    }

    addLog(`\n✅ Test complete! Cache size: ${cacheSize}`);
    setAutoTestRunning(false);
  };

  const testWords = ['hello', 'world', 'construction', 'education', 'biology'];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Audio Cache Test Page</h1>
        <p className="text-gray-600">Interactive testing for the audio cache system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Controls */}
        <div className="space-y-6">
          {/* Status Panel */}
          <div className="p-6 bg-white border rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Selected Word:</span>
                <span className="font-mono font-bold">{selectedWord || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">State:</span>
                <span className={`font-semibold ${
                  isLoading ? 'text-yellow-600' :
                  isReady ? 'text-green-600' :
                  'text-gray-400'
                }`}>
                  {isLoading ? '⏳ Loading...' : isReady ? '✓ Ready' : '○ Idle'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Size:</span>
                <span className="font-semibold text-blue-600">{cacheSize} words</span>
              </div>
              {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Manual Test Controls */}
          <div className="p-6 bg-white border rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Manual Testing</h2>

            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-600">Click words to load (first click = generate, second = cached):</p>
              <div className="flex flex-wrap gap-2">
                {testWords.map(word => (
                  <button
                    key={word}
                    onClick={() => testSingleWord(word)}
                    disabled={isLoading}
                    className={`
                      px-4 py-2 rounded font-medium transition-colors
                      ${selectedWord === word
                        ? 'bg-yellow-400 text-black'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={playAudio}
                disabled={!isReady || isLoading}
                className={`
                  w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors
                  ${isReady && !isLoading
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  '⏳ Loading...'
                ) : isReady ? (
                  `▶️ Play "${selectedWord}"`
                ) : (
                  '▶️ Select a word first'
                )}
              </button>

              <button
                onClick={clearCache}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                🗑️ Clear Cache
              </button>
            </div>
          </div>

          {/* Automated Test */}
          <div className="p-6 bg-white border rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Automated Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              Runs a sequence of loads to verify caching behavior
            </p>
            <button
              onClick={runAutomatedTest}
              disabled={autoTestRunning || isLoading}
              className={`
                w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors
                ${autoTestRunning || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }
              `}
            >
              {autoTestRunning ? '🔄 Running...' : '🚀 Run Automated Test'}
            </button>
          </div>

          {/* Instructions */}
          <div className="p-6 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="font-semibold mb-2">How to Test:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Click a word (e.g., "hello") - takes 3-8 seconds</li>
              <li>Click "Play" to hear the pronunciation</li>
              <li>Click "hello" again - loads instantly (cached!)</li>
              <li>Or run automated test to verify caching</li>
            </ol>
          </div>
        </div>

        {/* Right Column: Test Log */}
        <div className="space-y-6">
          <div className="p-6 bg-white border rounded-lg shadow h-[800px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Test Log</h2>
              <button
                onClick={() => setTestLog([])}
                className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Clear Log
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-900 rounded p-4 font-mono text-sm">
              {testLog.length === 0 ? (
                <div className="text-gray-500">No logs yet. Start testing!</div>
              ) : (
                testLog.map((log, i) => (
                  <div
                    key={i}
                    className={`mb-1 ${
                      log.includes('✓') ? 'text-green-400' :
                      log.includes('✗') ? 'text-red-400' :
                      log.includes('⚠') ? 'text-yellow-400' :
                      log.includes('🚀') || log.includes('✅') ? 'text-blue-400' :
                      'text-gray-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="p-6 bg-white border rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Expected Performance</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Action</th>
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">First click (generate)</td>
                  <td className="py-2 font-mono">3-8 seconds</td>
                  <td className="py-2 text-yellow-600">Normal</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Second click (cached)</td>
                  <td className="py-2 font-mono">&lt;100ms</td>
                  <td className="py-2 text-green-600">Fast</td>
                </tr>
                <tr>
                  <td className="py-2">Play button</td>
                  <td className="py-2 font-mono">Instant</td>
                  <td className="py-2 text-green-600">Ready</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
