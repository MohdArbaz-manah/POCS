import Image from "next/image";
import MeterDashboard from "./components/meters/page";
import MeterData from "./components/MetersData/page";

export default function Home() {
  return (
    <div >
    {/* <MeterDashboard /> */}
    <MeterData />
    </div>
  );
}
