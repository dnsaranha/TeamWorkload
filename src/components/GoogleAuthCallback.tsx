import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { googleCalendarService } from "../lib/googleCalendarService";

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        console.error("OAuth error:", error);
        setStatus("error");
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      if (code) {
        try {
          // Exchange code for tokens (disabled)
          const success = false; // Google Calendar integration disabled

          if (success) {
            setStatus("success");
            setTimeout(() => navigate("/"), 2000);
          } else {
            setStatus("error");
            setTimeout(() => navigate("/"), 3000);
          }
        } catch (error) {
          console.error("Error handling auth callback:", error);
          setStatus("error");
          setTimeout(() => navigate("/"), 3000);
        }
      } else {
        setStatus("error");
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connecting to Google Calendar...
              </h2>
              <p className="text-gray-600">
                Please wait while we complete the authentication process.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Successfully Connected!
              </h2>
              <p className="text-gray-600">
                Your Google Calendar has been connected. Redirecting...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-600">
                Google Calendar integration is currently disabled.
                Redirecting...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
