import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import {
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
} from "lucide-react";

interface AlertMessageProps {
  children: React.ReactNode;
  showAlert: boolean;
  setShowAlert: React.Dispatch<React.SetStateAction<boolean>>;
  type?: "error" | "success" | "warning" | "info";
  dismissable?: boolean;
  title?: string;
}

const AlertMessage = ({
  children,
  showAlert,
  setShowAlert,
  type = "error",
  dismissable = true,
  title,
}: AlertMessageProps) => {
  const getAlertClasses = () => {
    switch (type) {
      case "success":
        return "bg-green-100 border border-green-400 text-green-700";
      case "warning":
        return "bg-yellow-100 border border-yellow-400 text-yellow-800";
      case "info":
        return "bg-blue-100 border border-blue-400 text-blue-700";
      case "error":
      default:
        return "bg-red-100 border border-red-400 text-red-700";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 mr-2" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 mr-2" />;
      case "info":
        return <Info className="w-5 h-5 mr-2" />;
      case "error":
      default:
        return <XCircle className="w-5 h-5 mr-2" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showAlert && (
        <motion.div
          key="alert-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          layout
          className={`absolute top-0 left-0 right-0 mb-4 px-4 py-3 rounded relative z-20 ${getAlertClasses()}`}
        >
          {dismissable && (
            <button
              className="absolute top-2 right-3 text-xl leading-none"
              onClick={() => setShowAlert(false)}
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="text-sm pr-6">
            {title && (
              <div className="flex items-center font-semibold mb-1">
                {getIcon()}
                <span>{title}</span>
              </div>
            )}
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlertMessage;
