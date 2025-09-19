import * as React from "react";

export default function SimpleLines({ data }: { data: any[] }) {
  const [R, setR] = React.useState<any>(null);
  React.useEffect(() => {
    let alive = true;
    import("recharts").then((mod) => {
      if (alive) setR(mod);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!R) {
    return (
      <div
        style={{
          height: 280,
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
          border: "1px solid rgba(102, 126, 234, 0.1)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: 14,
          fontWeight: "500"
        }}
      >
        Loading chart...
      </div>
    );
  }

  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid } = R;
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(102, 126, 234, 0.2)",
          borderRadius: 12,
          padding: "12px 16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          fontSize: 14,
          fontWeight: "500"
        }}>
          <p style={{ margin: "0 0 8px 0", color: "#1f2937", fontWeight: "600" }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ 
              margin: "4px 0", 
              color: entry.color,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: entry.color,
                display: "inline-block"
              }}></span>
              {entry.dataKey}: {entry.dataKey === 'cost' ? `$${entry.value?.toFixed(2)}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        height: 280,
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
        border: "1px solid rgba(102, 126, 234, 0.1)",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#667eea" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#764ba2" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#764ba2" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(102, 126, 234, 0.1)" />
          <XAxis 
            dataKey="t" 
            hide 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => value.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="clicks"
            stroke="#667eea"
            strokeWidth={3}
            fill="url(#clicksGradient)"
            dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#667eea', strokeWidth: 2, fill: '#fff' }}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#764ba2"
            strokeWidth={3}
            fill="url(#costGradient)"
            dot={{ fill: '#764ba2', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#764ba2', strokeWidth: 2, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
