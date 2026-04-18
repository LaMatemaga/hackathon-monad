import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useBlockStore } from '../hooks/useBlockStore'
import { CHAINS, CHAIN_ORDER } from '../lib/chains'


const MIN_BLOCKS = 10
const DOMAIN: [number, number] = [0, 20_000]
const X_TICKS = [0, 5_000, 10_000, 15_000, 20_000]
// 500ms bins — fine enough for Monad, sensible for BNB and ETH
const BIN_THRESHOLDS = d3.range(DOMAIN[0], DOMAIN[1] + 500, 500)

function std(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
}

export function BlockDistribution() {
  const blockTimeHistory = useBlockStore((s) => s.blockTimeHistory)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const chainData = CHAIN_ORDER.map((chainId) => {
    const raw = blockTimeHistory[chainId].filter((t) => t >= DOMAIN[0] && t <= DOMAIN[1])
    return { chainId, raw }
  })

  const anyReady = chainData.some((d) => d.raw.length >= MIN_BLOCKS)

  useEffect(() => {
    if (!anyReady) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = containerRef.current?.clientWidth || 800
    const H = 280
    const marginL = 48
    const marginR = 16
    const marginT = 16
    const marginB = 36

    const xScale = d3.scaleLinear().domain(DOMAIN).range([marginL, W - marginR])

    // Bin each chain; normalize to frequency (proportion) so all chains are comparable
    const binnedChains = chainData.map(({ chainId, raw }) => {
      const total = raw.length || 1
      const bins = d3.bin().domain(DOMAIN).thresholds(BIN_THRESHOLDS)(raw)
      const freqBins = bins.map((b) => ({ ...b, freq: b.length / total }))
      return { chainId, bins: freqBins, raw }
    })

    const maxFreq = d3.max(binnedChains.flatMap((c) => c.bins.map((b) => b.freq))) ?? 0.01

    const yScale = d3.scaleLinear()
      .domain([0, maxFreq * 1.1])
      .range([H - marginB, marginT])

    // Grid lines
    yScale.ticks(5).forEach((t) => {
      svg.append('line')
        .attr('x1', marginL).attr('x2', W - marginR)
        .attr('y1', yScale(t)).attr('y2', yScale(t))
        .attr('stroke', '#151025').attr('stroke-width', 1)
    })

    // Bars per chain
    binnedChains.forEach(({ chainId, bins, raw }) => {
      if (raw.length < MIN_BLOCKS) return
      const color = CHAINS[chainId].color

      bins.forEach((bin) => {
        if (bin.length === 0) return
        const x0 = xScale(bin.x0 ?? 0)
        const x1 = xScale(bin.x1 ?? 0)
        const barW = Math.max(0, x1 - x0 - 1)

        svg.append('rect')
          .attr('x', x0)
          .attr('y', yScale(bin.freq))
          .attr('width', barW)
          .attr('height', H - marginB - yScale(bin.freq))
          .attr('fill', color)
          .attr('fill-opacity', 0.55)
          .attr('rx', 1)
      })

      // Median dashed line + label
      const median = d3.median(raw) ?? 0
      const mx = xScale(median)
      svg.append('line')
        .attr('x1', mx).attr('y1', marginT)
        .attr('x2', mx).attr('y2', H - marginB)
        .attr('stroke', color).attr('stroke-opacity', 0.9)
        .attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3')

      svg.append('text')
        .attr('x', mx + 3).attr('y', marginT + 10)
        .attr('fill', color).attr('fill-opacity', 0.9)
        .attr('font-size', 8).attr('font-family', 'Roboto Mono, monospace')
        .attr('font-weight', 600)
        .text(CHAINS[chainId].name)
    })

    // X axis
    svg.append('g')
      .attr('transform', `translate(0, ${H - marginB})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues(X_TICKS)
          .tickFormat((d) => `${Number(d) / 1000}s`)
      )
      .call((g) => {
        g.select('.domain').attr('stroke', '#222')
        g.selectAll('line').attr('stroke', '#333')
        g.selectAll('text')
          .attr('fill', '#444').attr('font-size', 8)
          .attr('font-family', 'Roboto Mono, monospace')
      })

    // Y axis (frequency %)
    svg.append('g')
      .attr('transform', `translate(${marginL}, 0)`)
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => `${(Number(d) * 100).toFixed(0)}%`)
      )
      .call((g) => {
        g.select('.domain').remove()
        g.selectAll('line').attr('stroke', '#222')
        g.selectAll('text')
          .attr('fill', '#444').attr('font-size', 8)
          .attr('font-family', 'Roboto Mono, monospace')
      })

    // X label
    svg.append('text')
      .attr('x', (marginL + W - marginR) / 2)
      .attr('y', H - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333').attr('font-size', 8)
      .attr('font-family', 'Roboto Mono, monospace').attr('letter-spacing', 1)
      .text('BLOCK TIME')

    // Y label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(marginT + (H - marginT - marginB) / 2))
      .attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333').attr('font-size', 8)
      .attr('font-family', 'Roboto Mono, monospace').attr('letter-spacing', 1)
      .text('FREQUENCY')

  }, [blockTimeHistory, anyReady])

  const collectingChains = chainData.filter((d) => d.raw.length < MIN_BLOCKS)

  return (
    <div style={{ width: '100%', padding: '48px 40px 60px' }}>
      <div style={{ fontFamily: 'Roboto Mono, monospace', marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: '#6E54FF', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
          Block Time Distribution
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e0d8ff', lineHeight: 1.2 }}>
          Every ~500ms. Consistent. Reliable.
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>
          Frequency of actual inter-block times measured live across all three chains.
        </div>
      </div>

      <div ref={containerRef} style={{ width: '100%' }}>
        {!anyReady ? (
          <div style={{
            height: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Roboto Mono, monospace',
            fontSize: 10,
            color: '#2a2a2a',
            letterSpacing: 1,
            border: '1px solid #111',
            borderRadius: 4,
            flexDirection: 'column',
            gap: 6,
          }}>
            <span>COLLECTING BLOCK DATA</span>
            {chainData.map(({ chainId, raw }) => (
              <span key={chainId} style={{ color: CHAINS[chainId].color, fontSize: 9 }}>
                {CHAINS[chainId].name}: {raw.length}/{MIN_BLOCKS}
              </span>
            ))}
          </div>
        ) : (
          <svg ref={svgRef} width="100%" height={280} style={{ display: 'block', overflow: 'hidden' }} />
        )}
      </div>

      {/* Legend + stats row */}
      <div style={{ display: 'flex', gap: 32, marginTop: 16, flexWrap: 'wrap' }}>
        {chainData.map(({ chainId, raw }) => {
          const color = CHAINS[chainId].color
          const ready = raw.length >= MIN_BLOCKS
          const median = ready ? (d3.median(raw) ?? 0) : null
          const sigma = ready ? std(raw) : null
          const medLabel = median !== null
            ? (median < 1000 ? `${median.toFixed(0)}ms` : `${(median / 1000).toFixed(2)}s`)
            : '—'
          const sigLabel = sigma !== null
            ? (sigma < 1000 ? `${sigma.toFixed(0)}ms` : `${(sigma / 1000).toFixed(2)}s`)
            : '—'

          return (
            <div key={chainId} style={{ fontFamily: 'Roboto Mono, monospace', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.8, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, color, fontWeight: 700, letterSpacing: 1 }}>
                  {CHAINS[chainId].name.toUpperCase()}
                </div>
                <div style={{ fontSize: 8, color: '#444', marginTop: 1 }}>
                  {ready ? `median ${medLabel} · σ ${sigLabel} · ${raw.length} blocks` : `collecting… ${raw.length}/${MIN_BLOCKS}`}
                </div>
              </div>
            </div>
          )
        })}

        {collectingChains.length > 0 && anyReady && (
          <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: 8, color: '#2a2a2a', alignSelf: 'center' }}>
            {collectingChains.map((d) => CHAINS[d.chainId].name).join(', ')} still collecting
          </div>
        )}
      </div>
    </div>
  )
}
