"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../configuration"; // pastikan auth di-export dari configuration.ts
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tab";
import {
  ParkingAssignment,
  ParkingAttendant,
  ParkingLot,
  ParkingSchedule,
} from "../../interface/interface";
import { LoadingAnimation } from "../ui/loading/LoadingAnimation";
import SearchInput from "../ui/search";
import Switch from "../form/switch/Switch";

const DAYS = [
  { key: "monday", label: "Senin" },
  { key: "tuesday", label: "Selasa" },
  { key: "wednesday", label: "Rabu" },
  { key: "thursday", label: "Kamis" },
  { key: "friday", label: "Jumat" },
  { key: "saturday", label: "Sabtu" },
  { key: "sunday", label: "Minggu" },
];

interface ScheduleItem {
  lotName: string;
  openTime: string;
  closedTime: string;
  attendantName: string;
  attendantId: string; // tambahkan ini untuk filter by UID
}

export default function ParkingScheduleSection() {
  const [dataByDay, setDataByDay] = useState<Record<string, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showMyScheduleOnly, setShowMyScheduleOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(auth.currentUser?.uid ?? null); // ambil UID user login
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [scheduleSnap, assignmentSnap, lotSnap, attendantSnap] = await Promise.all([
          getDocs(collection(db, "parking_schedules")),
          getDocs(collection(db, "parking_assignments")),
          getDocs(collection(db, "parking_lots")),
          getDocs(collection(db, "parking_attendants")),
        ]);

        const schedules: ParkingSchedule[] = scheduleSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ParkingSchedule[];

        const assignments: ParkingAssignment[] = assignmentSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ParkingAssignment[];

        const lots: ParkingLot[] = lotSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ParkingLot[];

        const attendants: ParkingAttendant[] = attendantSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ParkingAttendant[];

        const groupedData: Record<string, ScheduleItem[]> = {};

        for (const day of DAYS) {
          const schedulesForDay = schedules.filter((s) => s.day_of_week === day.key);
          const items: ScheduleItem[] = [];

          for (const schedule of schedulesForDay) {
            const relatedAssignments = assignments.filter(
              (a) => a.parking_schedule_id === schedule.id
            );

            for (const assignment of relatedAssignments) {
              const lot = lots.find((l) => l.id === assignment.parking_lot_id);
              const attendant = attendants.find(
                (at) => at.id === assignment.parking_attendant_id
              );

              if (lot && attendant) {
                items.push({
                  lotName: lot.name,
                  openTime: schedule.open_time,
                  closedTime: schedule.closed_time,
                  attendantName: attendant.name,
                  attendantId: attendant.id,
                });
              }
            }
          }

          groupedData[day.key] = items;
        }

        setDataByDay(groupedData);
      } catch (e) {
        console.error("ERROR GET SCHEDULE:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="w-full">
      {/* Toggle: Jadwal Saya */}
      <div className="flex items-center gap-2 mb-4">
        <Switch
          onChange={setShowMyScheduleOnly}
          defaultChecked={showMyScheduleOnly} label={"Tampilkan Jadwal Saya Saja"}          
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="monday" className="w-full">
        <TabsList className="grid grid-cols-7 mb-4">
          {DAYS.map((day) => (
            <TabsTrigger key={day.key} value={day.key}>
              {day.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {DAYS.map((day) => {
          const allData = dataByDay[day.key] || [];

          // Filter berdasarkan toggle + search
          const filteredData = allData.filter((item) => {
            const matchSearch = item.attendantName.toLowerCase().includes(search.toLowerCase());
            const matchUser = !showMyScheduleOnly || item.attendantId === currentUserId;
            return matchSearch && matchUser;
          });

          return (
            <TabsContent
              key={day.key}
              value={day.key}
              className="py-5 overflow-x-scroll sm:overflow-x-hidden rounded-xl border border-gray-300 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
            >
              <SearchInput
                placeholder="Cari berdasarkan nama petugas..."
                value={search}
                onChange={setSearch}
              />

              {loading ? (
                <LoadingAnimation />
              ) : filteredData.length > 0 ? (
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell className="ps-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Tempat Parkir
                      </TableCell>
                      <TableCell className="ps-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Buka
                      </TableCell>
                      <TableCell className="ps-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Tutup
                      </TableCell>
                      <TableCell className="ps-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Petugas
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, index) => (
                      <TableRow
                        key={index}
                        className={`py-5 ${
                          index % 2 !== 1
                            ? "bg-gray-200 dark:bg-gray-900"
                            : ""
                        } hover:bg-gray-100 dark:hover:bg-gray-800`}
                      >
                        <TableCell className="py-4 text-gray-800 text-theme-sm dark:text-white/90">
                          {item.lotName}
                        </TableCell>
                        <TableCell className="py-4 text-green-500 text-theme-sm">
                          {item.openTime}
                        </TableCell>
                        <TableCell className="py-4 text-red-400 text-theme-sm">
                          {item.closedTime}
                        </TableCell>
                        <TableCell className="py-4 text-gray-800 text-theme-sm dark:text-white/90">
                          {item.attendantName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-gray-500 text-theme-sm py-4">
                  Tidak ada jadwal yang cocok
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
