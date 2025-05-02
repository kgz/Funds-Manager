import { motion } from "motion/react";
import { CheckCircle } from "lucide-react"; // optional icon
import React from "react";

interface SuccessMessageProps {
  message: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 p-4 rounded-lg bg-green-100 text-green-800 shadow-sm border border-green-300"
    >
      <CheckCircle className="w-5 h-5 text-green-600" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
};

export default SuccessMessage;