async function openPlayerProfile(targetUserId) {
    // 1. Скрываем модальное окно рейтинга, чтобы оно не перекрывало профиль
    const leaderboardModal = document.getElementById("leaderboard-modal");
    if (leaderboardModal) leaderboardModal.style.display = "none";

    // 2. Открываем модальное окно профиля игрока
    const modal = document.getElementById("view-profile-modal");
    if (modal) modal.style.display = "flex";

    document.getElementById("vp-username").textContent = "Загрузка...";
    document.getElementById("vp-coins").textContent = "...";
    document.getElementById("vp-tap").textContent = "...";
    document.getElementById("vp-passive").textContent = "...";
    document.getElementById("vp-refs").textContent = "...";

    try {
        const resPlayer = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${targetUserId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const playerData = await resPlayer.json();

        if (playerData && playerData.length > 0) {
            const p = playerData[0];
            let rawName = p.username || p.user_id;
            document.getElementById("vp-username").textContent = rawName.startsWith("@") ? rawName : "@" + rawName;
            document.getElementById("vp-coins").textContent = Number(p.coins || 0).toFixed(1);
            document.getElementById("vp-tap").textContent = Number(p.tap_power || 0.2).toFixed(1);
            document.getElementById("vp-passive").textContent = Number(p.passive_income_ps || 0).toFixed(1);
        } else {
            document.getElementById("vp-username").textContent = "Не найден";
        }

        const resRefs = await fetch(`${SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.${targetUserId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const refsData = await resRefs.json();
        document.getElementById("vp-refs").textContent = refsData ? refsData.length : 0;

    } catch (e) {
        console.error("Ошибка при открытии профиля игрока:", e);
        document.getElementById("vp-username").textContent = "Ошибка загрузки";
    }
}
