"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "../../configuration";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { LoadingAnimation } from "../ui/loading/LoadingAnimation";
import { ParkingActivity, ParkingAssignment, ParkingAttendant, ParkingHistory, ParkingLot, ParkingSchedule, Student, Vehicle } from "../../interface/interface";
import SearchInput from "../ui/search";
import InformationBox from "./InformationBox";
import { BoxCubeIcon, UserIcon } from "../../icons";
import { TodayDate } from "../ui/text/TodayDate";

interface ActivityItem {
  studentName: string;
  nim: string;
  vehiclePlate: string;
  parkedAt: string;
  exitedAt: string;
  status: string;
}

interface TabData {
  lotId: string;
  lotName: string;
  vehicleInCount: number;
  maxCapacity: number;
  attendantName: string;
  activities: ActivityItem[];
}

export default function ParkingActivitySection() {
  const [data, setData] = useState<TabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const today = new Date();
        const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTimestamp = Timestamp.fromDate(startOfDay);

        const [parkingLotsSnap, parkingSchedulesSnap, parkingAssignmentsSnap, parkingAttendantsSnap, parkingActivitiesSnap, parkingHistoriesSnap, studentsSnap, vehiclesSnap] = await Promise.all([
          getDocs(collection(db, "parking_lots")),
          getDocs(collection(db, "parking_schedules")),
          getDocs(collection(db, "parking_assignments")),
          getDocs(collection(db, "parking_attendants")),
          getDocs(collection(db, "parking_activities")),
          getDocs(collection(db, "parking_histories")),
          getDocs(collection(db, "students")),
          getDocs(collection(db, "vehicles")),
        ]);

        const parkingLots: ParkingLot[] = parkingLotsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ParkingLot));
        const parkingSchedules: ParkingSchedule[] = parkingSchedulesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ParkingSchedule));
        const parkingAssignments: ParkingAssignment[] = parkingAssignmentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ParkingAssignment));
        const parkingAttendants: ParkingAttendant[] = parkingAttendantsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ParkingAttendant));
        const parkingActivities: ParkingActivity[] = parkingActivitiesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ParkingActivity));
        const parkingHistories: ParkingHistory[] = parkingHistoriesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ParkingHistory));
        const students: Student[] = studentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Student));
        const vehicles: Vehicle[] = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Vehicle));

        // Cari attendant dengan ID user saat ini
        const currentAttendant = parkingAttendants.find((att) => att.id === auth.currentUser?.uid);
        if (!currentAttendant) {
          setData(null);
          setLoading(false);
          return;
        }

        const todaySchedules = parkingSchedules.filter((schedule) => schedule.day_of_week === dayOfWeek && !schedule.is_closed);
        const todayScheduleIds = todaySchedules.map((schedule) => schedule.id);

        const todayAssignments = parkingAssignments.filter((assignment) => assignment.parking_attendant_id === currentAttendant.id && todayScheduleIds.includes(assignment.parking_schedule_id));

        const activeLotIds = parkingLots.filter((lot) => lot.is_active).map((lot) => lot.id);
        const validAssignment = todayAssignments.find((a) => activeLotIds.includes(a.parking_lot_id));

        if (!validAssignment) {
          setData(null);
          setLoading(false);
          return;
        }

        const lot = parkingLots.find((l) => l.id === validAssignment.parking_lot_id);
        const activitiesForLot = parkingActivities.filter((activity) => activity.parking_lot_id === lot?.id && activity.created_at.seconds >= startTimestamp.seconds);

        const latestActivity = activitiesForLot.sort((a, b) => b.updated_at.seconds - a.updated_at.seconds)[0];

        const vehicleInCount = latestActivity?.vehicle_in_count || 0;

        const activities: ActivityItem[] = activitiesForLot.map((activity) => {
          const history = parkingHistories.find((h) => h.id === activity.parking_history_id);
          const student = students.find((s) => s.id === activity.student_id);
          const vehicle = vehicles.find((v) => v.student_id === activity.student_id);

          return {
            studentName: student?.name || "-",
            nim: student?.nim || "-",
            vehiclePlate: vehicle?.plate || "-",
            parkedAt: history?.parked_at ? new Date(history.parked_at.seconds * 1000).toLocaleTimeString() : "-",
            exitedAt: history?.exited_at ? new Date(history.exited_at.seconds * 1000).toLocaleTimeString() : "-",
            status: history?.status || "-",
          };
        });

        const lotData: TabData = {
          lotId: lot?.id || "-",
          lotName: lot?.name || "-",
          vehicleInCount: vehicleInCount,
          maxCapacity: lot?.max_capacity || 0,
          attendantName: currentAttendant.name,
          activities,
        };

        setData(lotData);
      } catch (error) {
        console.error("Error fetching parking activity data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingAnimation />;

  if (!data) return <p className="text-center text-gray-500 py-10">Tidak ada data aktivitas parkir untuk Anda hari ini.</p>;

  const filteredActivities = data.activities.filter((activity) => activity.studentName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full">
      <TodayDate/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <InformationBox icon={<BoxCubeIcon className="text-gray-800 size-6 dark:text-white/90" />} title="Kapasitas Parkir" value={`${data.vehicleInCount} / ${data.maxCapacity}`} />
        <InformationBox icon={<UserIcon className="text-gray-800 size-6 dark:text-white/90" />} title="Petugas Parkir" value={data.attendantName} />
      </div>
      <div className="py-5 overflow-x-scroll sm:overflow-x-hidden rounded-xl border border-gray-300 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <SearchInput placeholder="Cari berdasarkan nama mahasiswa..." value={search} onChange={setSearch} />
        {filteredActivities.length > 0 ? (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell className="ps-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Nama Mahasiswa</TableCell>
                <TableCell className="ps-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">NIM</TableCell>
                <TableCell className="ps-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Kendaraan</TableCell>
                <TableCell className="ps-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Waktu Masuk</TableCell>
                <TableCell className="ps-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Waktu Keluar</TableCell>
                <TableCell className="ps-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity, index) => (
                <TableRow key={index} className={`py-5 ${index % 2 !== 1 ? "bg-gray-200 dark:bg-gray-900" : ""} hover:bg-gray-100 dark:hover:bg-gray-800`}>
                  <TableCell className="py-4 text-theme-sm text-gray-800 dark:text-white/90">{activity.studentName}</TableCell>
                  <TableCell className="py-4 text-theme-sm text-gray-800 dark:text-white/90">{activity.nim}</TableCell>
                  <TableCell className="py-4 text-theme-sm text-gray-800 dark:text-white/90">{activity.vehiclePlate}</TableCell>
                  <TableCell className={`py-4 text-theme-sm ${activity.parkedAt == "-" ? "text-gray-800 dark:text-white/90" : "text-green-500 "}`}>{activity.parkedAt}</TableCell>
                  <TableCell className={`py-4 text-theme-sm  ${activity.exitedAt == "-" ? "text-gray-800 dark:text-white/90" : "text-red-400 "}`}>{activity.exitedAt}</TableCell>
                  <TableCell className={`py-4 text-theme-sm font-semibold ${activity.status == "in" ? "text-green-500" : "text-red-400"}`}>{activity.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-theme-sm text-gray-500 py-4">Tidak ada data</p>
        )}
      </div>
    </div>
  );
}
