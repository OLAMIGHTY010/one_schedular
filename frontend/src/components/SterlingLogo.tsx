type Props = {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
};

export default function SterlingLogo({ size = "md", variant = "light" }: Props) {
  const dims = { sm: { w: 120, circle: 22, cx: 16, cy: 14, dot: 5, tx: 44, ty: 21, fs: 18 },
                  md: { w: 160, circle: 30, cx: 22, cy: 18, dot: 7, tx: 58, ty: 28, fs: 24 },
                  lg: { w: 210, circle: 40, cx: 28, cy: 23, dot: 9, tx: 76, ty: 37, fs: 32 } }[size];

  const textColor = variant === "dark" ? "#555555" : "white";

  return (
    <svg
      width={dims.w}
      height={dims.circle * 1.6}
      viewBox={`0 0 ${dims.w} ${dims.circle * 1.6}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Red circle */}
      <circle
        cx={dims.cx}
        cy={dims.cy}
        r={dims.circle * 0.72}
        fill="#E8001C"
      />
      {/* White dot inside circle */}
      <circle
        cx={dims.cx - dims.circle * 0.18}
        cy={dims.cy - dims.circle * 0.26}
        r={dims.dot}
        fill="white"
      />
      {/* "sterling" text */}
      <text
        x={dims.tx}
        y={dims.ty}
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize={dims.fs}
        fill={textColor}
        letterSpacing="-0.5"
      >
        sterling
      </text>
    </svg>
  );
}