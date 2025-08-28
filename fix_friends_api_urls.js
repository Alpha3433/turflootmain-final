// Updated API calls for FriendsPanel to use getApiUrl utility function

// fetchFriends function
const apiUrl = getApiUrl(`/api/friends/list?userId=${user.id}`)
console.log('🔗 DEBUG: Using friends list URL =', apiUrl)

// fetchOnlineFriends function  
const onlineUrl = getApiUrl(`/api/friends/online-status?userId=${user.id}`)
console.log('🔗 DEBUG: Using online friends URL =', onlineUrl)

// fetchPendingRequests function
const response = await fetch(getApiUrl('/api/friends/requests/pending'), {

// fetchNotificationCount function
const response = await fetch(getApiUrl('/api/friends/notifications/count'), {

// acceptFriendRequest function
const response = await fetch(getApiUrl('/api/friends/accept-request'), {

// declineFriendRequest function
const response = await fetch(getApiUrl('/api/friends/decline-request'), {

// markNotificationsAsRead function
await fetch(getApiUrl('/api/friends/notifications/mark-read'), {