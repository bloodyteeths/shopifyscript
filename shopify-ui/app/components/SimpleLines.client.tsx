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
          height: 240,
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 8,
        }}
      />
    );
  }

  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } = R;
  return (
    <div
      style={{
        height: 240,
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 8,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="t" hide />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="clicks" />
          <Line type="monotone" dataKey="cost" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
