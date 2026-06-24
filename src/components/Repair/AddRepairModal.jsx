import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AddRepairModal({ isOpen, onClose, onSuccess }) {
    const [devices, setDevices] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

    // State สำหรับช่องค้นหาอุปกรณ์
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const dropdownRef = useRef(null); // ใช้ดักจับการคลิกนอก Dropdown

    // States สำหรับข้อมูลฟอร์ม
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [requestedBy, setRequestedBy] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // 1. ดึงข้อมูลทะเบียนอุปกรณ์จากตาราง devices
    useEffect(() => {
        if (!isOpen) return;
        const fetchDevices = async () => {
            try {
                setLoadingDevices(true);
                const { data, error } = await supabase
                    .from('devices')
                    .select('id, asset_code, device_name, location, department')
                    .order('device_name', { ascending: true });

                if (error) throw error;
                setDevices(data || []);
            } catch (err) {
                setError('ไม่สามารถดึงข้อมูลทะเบียนอุปกรณ์ได้');
            } finally {
                setLoadingDevices(false);
            }
        };
        fetchDevices();
    }, [isOpen]);

    // 2. ดักจับการคลิกข้างนอกเพื่อให้ช่องค้นหาหุบลงอัตโนมัติ
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // คัดกรองอุปกรณ์ตามคำค้นหา (ค้นหาจากชื่อ หรือ รหัสทรัพย์สิน)
    const filteredDevices = devices.filter(device =>
        device.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.asset_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDevice) {
            setError('กรุณาค้นหาและเลือกอุปกรณ์ในระบบ');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const ticketNo = `REP-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

            const { error: insertError } = await supabase
                .from('repairs')
                .insert([
                    {
                        ticket_no: ticketNo,
                        device_id: selectedDevice.id,
                        device_name: selectedDevice.device_name,
                        asset_code: selectedDevice.asset_code,
                        description: description,
                        priority: priority,
                        requested_by: requestedBy,
                        status: 'Pending'
                    }
                ]);

            if (insertError) throw insertError;

            // ล้างฟอร์มเมื่อสำเร็จ
            setSelectedDevice(null);
            setSearchTerm('');
            setDescription('');
            setRequestedBy('');
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { if (!submitting) !v && onClose(); }}>
            <DialogContent className="max-w-md bg-background border shadow-xl p-5 sm:rounded-2xl flex flex-col overflow-visible">
                <DialogHeader className="border-b pb-3 shrink-0">
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Wrench size={18} className="text-primary" />
                        <span>สร้างใบแจ้งซ่อมใหม่</span>
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-lg mt-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 my-2 flex-1 w-full overflow-visible">

                    {/* ช่องค้นหาอุปกรณ์จากทะเบียนหน้า Device */}
                    <div className="space-y-1.5 relative" ref={dropdownRef}>
                        <Label className="text-xs font-bold text-foreground/80">ค้นหาอุปกรณ์ในระบบ <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={loadingDevices ? "กำลังโหลดข้อมูลอุปกรณ์..." : "พิมพ์ชื่อ หรือ รหัสทรัพย์สินเพื่อค้นหา..."}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                    if (selectedDevice) setSelectedDevice(null);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                disabled={loadingDevices || submitting}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        {/* ผลลัพธ์ Dropdown การค้นหา */}
                        {showDropdown && searchTerm && !selectedDevice && (
                            <div className="absolute z-50 w-full bg-popover border border-border shadow-lg rounded-lg max-h-48 overflow-y-auto mt-1 divide-y divide-border text-xs">
                                {filteredDevices.length === 0 ? (
                                    <div className="p-3 text-muted-foreground text-center">ไม่พบอุปกรณ์นี้ในทะเบียน</div>
                                ) : (
                                    filteredDevices.map(device => (
                                        <div
                                            key={device.id}
                                            onClick={() => {
                                                setSelectedDevice(device);
                                                setSearchTerm(`${device.device_name} (${device.asset_code || 'ไม่มีรหัส'})`);
                                                setShowDropdown(false);
                                            }}
                                            className="p-2.5 hover:bg-muted cursor-pointer transition-colors flex flex-col gap-0.5"
                                        >
                                            <span className="font-medium text-foreground">📦 {device.device_name}</span>
                                            <span className="text-[10px] text-muted-foreground">รหัส: {device.asset_code || '—'} | แผนก: {device.department || '—'}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* ชื่อผู้แจ้งซ่อม */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground/80">ชื่อผู้แจ้งซ่อม / ผู้ใช้งานเครื่อง</Label>
                        <Input
                            placeholder="กรอกชื่อผู้แจ้งซ่อม"
                            value={requestedBy}
                            onChange={e => setRequestedBy(e.target.value)}
                            className="h-9 text-xs"
                            required
                            disabled={submitting}
                        />
                    </div>

                    {/* 🛠️ เปลี่ยนมาใช้แท็ก HTML <textarea> เพื่อแก้ปัญหาเรื่อง Vite Import Analysis */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground/80">รายละเอียดอาการชำรุด</Label>
                        <textarea
                            placeholder="ระบุอาการเสียโดยละเอียด เช่น หน้าจอเปิดไม่ติด ไฟไม่เข้า..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full min-h-[80px] text-xs rounded-md border border-input bg-background px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none text-foreground"
                            required
                            disabled={submitting}
                        />
                    </div>

                    {/* ปุ่มควบคุม */}
                    <div className="flex justify-end gap-2 border-t pt-3 mt-4 shrink-0">
                        <Button className="hover:bg-[#111827] hover:text-white"
                            variant="outline" onClick={onClose} disabled={submitting}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" className="hover:bg-[#111827] hover:text-white"
                            variant="outline" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 size={12} className="animate-spin mr-1" />
                                    กำลังบันทึก...
                                </>
                            ) : 'ส่งใบแจ้งซ่อม'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}