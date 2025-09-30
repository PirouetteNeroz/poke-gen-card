import { toast } from "sonner";
import { ErrorWithMessage } from "@/types";

export class AppError extends Error {
  code?: string;
  retry: boolean;

  constructor(message: string, code?: string, retry: boolean = false) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.retry = retry;
  }
}

export const handleError = (error: unknown, context?: string): ErrorWithMessage => {
  console.error(`Error in ${context || "unknown context"}:`, error);

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      retry: error.retry,
    };
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return {
        message: "Erreur de connexion. Vérifiez votre connexion Internet.",
        code: "NETWORK_ERROR",
        retry: true,
      };
    }

    // API errors
    if (error.message.includes("API") || error.message.includes("401")) {
      return {
        message: "Erreur d'API. Vérifiez votre clé API.",
        code: "API_ERROR",
        retry: false,
      };
    }

    // Timeout errors
    if (error.message.includes("timeout")) {
      return {
        message: "La requête a pris trop de temps. Réessayez.",
        code: "TIMEOUT_ERROR",
        retry: true,
      };
    }

    return {
      message: error.message,
      retry: false,
    };
  }

  return {
    message: "Une erreur inattendue s'est produite.",
    code: "UNKNOWN_ERROR",
    retry: true,
  };
};

export const showErrorToast = (error: unknown, context?: string) => {
  const errorInfo = handleError(error, context);
  
  toast.error(errorInfo.message, {
    description: errorInfo.retry 
      ? "Vous pouvez réessayer l'opération." 
      : "Veuillez vérifier votre configuration.",
  });

  return errorInfo;
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new AppError(
    `Échec après ${maxRetries} tentatives: ${lastError!.message}`,
    "MAX_RETRIES_EXCEEDED",
    false
  );
};
