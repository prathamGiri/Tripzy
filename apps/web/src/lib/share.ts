/** Links for sharing a trip. The invite link opens the join page on this website (and, later, the mobile app). */
export const inviteUrl = (code: string) => `${window.location.origin}/j/${code}`

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`
