import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { EnrichedBlock } from '../lib/types'
import { CHAINS } from '../lib/chains'

interface Props {
  ancestors: EnrichedBlock[]
  focal: EnrichedBlock
  child: EnrichedBlock | null
}

interface NodeDatum {
  block: EnrichedBlock
  isFocal: boolean
}

export function BlockLineage({ ancestors, focal, child }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const color = CHAINS[focal.chain].color

  const nodes: NodeDatum[] = [
    ...ancestors.map((b) => ({ block: b, isFocal: false })),
    { block: focal, isFocal: true },
    ...(child ? [{ block: child, isFocal: false }] : []),
  ]

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current?.clientWidth || 800
    const H = 110
    const marginX = 60
    const nodeW = 110
    const nodeH = 60
    const nodeY = (H - nodeH) / 2

    const xScale = d3.scalePoint<number>()
      .domain(nodes.map((_, i) => i))
      .range([marginX, W - marginX])
      .padding(0.3)

    // Draw connector lines
    for (let i = 0; i < nodes.length - 1; i++) {
      const x1 = (xScale(i) ?? 0) + nodeW / 2
      const x2 = (xScale(i + 1) ?? 0) - nodeW / 2
      svg.append('line')
        .attr('x1', x1).attr('y1', H / 2)
        .attr('x2', x2).attr('y2', H / 2)
        .attr('stroke', color)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', i === nodes.length - 2 && !child ? '4,4' : 'none')
    }

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('refX', 5).attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 6 3, 0 6')
      .attr('fill', color)
      .attr('fill-opacity', 0.6)

    // Draw nodes
    nodes.forEach((n, i) => {
      const cx = xScale(i) ?? 0
      const g = svg.append('g').attr('transform', `translate(${cx - nodeW / 2}, ${nodeY})`)

      const isFocal = n.isFocal
      const isChild = !isFocal && i === nodes.length - 1 && child === null

      g.append('rect')
        .attr('width', nodeW).attr('height', nodeH).attr('rx', 6)
        .attr('fill', isFocal ? color : 'transparent')
        .attr('fill-opacity', isFocal ? 0.15 : 0)
        .attr('stroke', isChild ? 'transparent' : color)
        .attr('stroke-opacity', isFocal ? 1 : 0.5)
        .attr('stroke-width', isFocal ? 2 : 1)
        .attr('stroke-dasharray', isChild ? '4,4' : 'none')

      const blockNum = Number(n.block.raw.number).toLocaleString()
      const txCount = n.block.raw.transactions.length
      const ts = new Date(Number(n.block.raw.timestamp) * 1000)
      const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      g.append('text')
        .attr('x', nodeW / 2).attr('y', 18)
        .attr('text-anchor', 'middle')
        .attr('fill', isFocal ? color : '#ccc')
        .attr('font-size', 11).attr('font-family', 'Roboto Mono, monospace').attr('font-weight', 700)
        .text(`#${blockNum}`)

      g.append('text')
        .attr('x', nodeW / 2).attr('y', 34)
        .attr('text-anchor', 'middle')
        .attr('fill', '#888').attr('font-size', 10).attr('font-family', 'Roboto Mono, monospace')
        .text(`${txCount} txs`)

      g.append('text')
        .attr('x', nodeW / 2).attr('y', 50)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666').attr('font-size', 9).attr('font-family', 'Roboto Mono, monospace')
        .text(timeStr)
    })

    // Pending child placeholder
    if (!child) {
      const cx = (xScale(nodes.length) ?? (xScale(nodes.length - 1) ?? 0) + 140)
      const px = Math.min(cx - nodeW / 2, W - marginX - nodeW)
      const g2 = svg.append('g').attr('transform', `translate(${px}, ${nodeY})`)

      svg.append('line')
        .attr('x1', (xScale(nodes.length - 1) ?? 0) + nodeW / 2)
        .attr('y1', H / 2)
        .attr('x2', px)
        .attr('y2', H / 2)
        .attr('stroke', color).attr('stroke-opacity', 0.2).attr('stroke-width', 1.5).attr('stroke-dasharray', '4,4')

      g2.append('rect')
        .attr('width', nodeW).attr('height', nodeH).attr('rx', 6)
        .attr('fill', 'transparent').attr('stroke', color).attr('stroke-opacity', 0.25).attr('stroke-width', 1).attr('stroke-dasharray', '4,4')
      g2.append('text')
        .attr('x', nodeW / 2).attr('y', nodeH / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#555').attr('font-size', 10).attr('font-family', 'Roboto Mono, monospace')
        .text('awaiting...')
    }
  }, [ancestors, focal, child, color]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100%', padding: '8px 0' }}>
      <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4, paddingLeft: 16 }}>
        Block Lineage — {CHAINS[focal.chain].name}
      </div>
      <svg ref={svgRef} width="100%" height={110} />
    </div>
  )
}
