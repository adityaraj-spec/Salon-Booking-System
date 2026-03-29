import { useNotification } from "../context/NotificationContext";
import { X, CheckCircle, AlertCircle } from "lucide-react";

export function Notification() {
    const { notification, hideNotification } = useNotification();

    if (!notification) return null;

    const { message, type } = notification;

    const bgColor = type === "success" ? "bg-green-50 border-green-200" : 
                    type === "info" ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200";
    const textColor = type === "success" ? "text-green-800" : 
                      type === "info" ? "text-blue-800" : "text-red-800";
    const iconColor = type === "success" ? "text-green-500" : 
                      type === "info" ? "text-blue-500" : "text-red-500";

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-5 duration-300 px-4 w-full flex justify-center pointer-events-none">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border shadow-lg ${bgColor} ${textColor} min-w-[320px] max-w-md pointer-events-auto`}>
                <div className={iconColor}>
                    {type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="flex-1 font-medium text-sm">
                    {message}
                </div>
                <button 
                    onClick={hideNotification}
                    className="p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
