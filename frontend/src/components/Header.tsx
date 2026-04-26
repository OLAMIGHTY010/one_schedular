type Props = { onLogout: () => void };

export default function Header({ onLogout }: Props) {
  const name = localStorage.getItem("display_name") || "User";
  return (
    <div className="bg-[#7b1e3a] text-white p-5 rounded-xl shadow-lg mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">SMO Timetable System</h1>
        <p className="text-sm opacity-80">Sterling Bank — Service Monitoring Officers</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs opacity-70">Signed in as</p>
          <p className="font-semibold text-sm">{name}</p>
        </div>
        <button
          onClick={onLogout}
          className="bg-white text-[#7b1e3a] font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}