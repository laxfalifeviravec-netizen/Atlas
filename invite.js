/* Invite friends — shares a personal sign-up link */
(function () {
  window.inviteLink = function (userId) { return location.origin + '/?ref=' + userId; };
  window.shareInvite = async function (user) {
    if (!user) return;
    const url = window.inviteLink(user.id);
    const text = 'Join me on One Culture — the app for people who love to drive. Find roads, drive with friends, buy and sell parts.';
    const say = window.showToast || window.showAppMsg || function () {};
    try {
      if (navigator.share) { await navigator.share({ title: 'One Culture', text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); say('Invite link copied!'); }
    catch (e) { say(url); }
  };
})();
