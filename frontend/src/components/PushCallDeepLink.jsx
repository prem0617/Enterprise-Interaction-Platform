import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { BACKEND_URL } from "../../config";

/**
 * Resolves ?pushCall=TOKEN into sessionStorage for GlobalCallProvider after verify.
 */
export default function PushCallDeepLink() {
  const [searchParams, setSearchParams] = useSearchParams();
  const doneRef = useRef(false);

  useEffect(() => {
    const token = searchParams.get("pushCall");
    if (!token || doneRef.current) return;
    doneRef.current = true;
    const autoAccept = searchParams.get("autoAccept") === "1";

    const next = new URLSearchParams(searchParams);
    next.delete("pushCall");
    setSearchParams(next, { replace: true });

    fetch(`${BACKEND_URL}/push/verify-call-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.fromUserId) {
          sessionStorage.setItem(
            "eip_push_call",
            JSON.stringify({
              fromUserId: data.fromUserId,
              fromUserName: data.fromUserName || "Someone",
              callType: data.callType || "audio",
              autoAccept,
            })
          );
        }
      })
      .catch(() => {});
  }, [searchParams, setSearchParams]);

  return null;
}
