"use client";

export default function SurveyCalculatingPanel(props: {
  title: string;
  message: string;
  percent: number;
}) {
  return (
    <div
      data-testid="survey-calculating"
      className="mx-auto max-w-2xl rounded-[30px] border border-cyan-200/70 bg-white/88 p-6 text-center shadow-[0_24px_50px_-32px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8"
    >
      <p className="text-sm font-semibold text-cyan-700">{props.title}</p>
      <h2 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">{props.message}</h2>
      <div className="mx-auto mt-6 h-2 w-full max-w-xl rounded-full bg-cyan-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300"
          style={{ width: `${props.percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-600">{props.percent}%</p>
    </div>
  );
}
