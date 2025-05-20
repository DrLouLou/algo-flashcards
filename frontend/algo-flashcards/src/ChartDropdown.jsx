// src/components/ChartDropdown.jsx
import React, { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

const COLOR_MAP = {
  none:   '#cccccc',
  again:  '#007bff',
  hard:   '#dc3545',
  good:   '#ffc107',
  easy:   '#28a745',
}

export default function ChartDropdown({ distribution }) {
  const [open, setOpen] = useState(false)
  // turn { none:10, again:5, ... } into [{ rating:'none', count:10 }, …]
  const data = Object.entries(distribution).map(([rating, count]) => ({
    rating,
    count,
  }))

  return (
    <div className="chart-dropdown">
      <button
        className="chart-toggle"
        onClick={() => setOpen(o => !o)}
      >
        {open ? 'Hide Stats' : 'Show Stats'}
      </button>

      {open && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="rating" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [value, 'Cards']} />
              <Bar dataKey="count">
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={COLOR_MAP[entry.rating]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
