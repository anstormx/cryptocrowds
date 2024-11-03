// src/utils/toastNotification.ts (or .tsx)
import { useToast } from "@/hooks/use-toast";

export const useNotification = () => {
    const { toast } = useToast();
    
    const notify = (title: string, description: string, variant: "default" | "destructive") => {
        toast({
            title,
            description,
            variant,
        });
    };

    return notify;
};