const { Server } = require('socket.io');

let io;
const onlineUsers = new Map(); // Key: UserID -> Value: SocketID

const initSocket = (server) => {
    io = new Server(server, {
        cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Thiết bị mới kết nối: ${socket.id}`);

        // Khi Flutter gửi mã UserID lên để "báo danh"
        socket.on('user_connected', (userId) => {
            onlineUsers.set(userId, socket.id);
            console.log(`👤 User #${userId} đang online (Socket: ${socket.id})`);
        });

        // Khi người dùng vuốt thoát App hoặc rớt mạng
        socket.on('disconnect', () => {
            for (let [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    console.log(`❌ User #${userId} đã offline`);
                    break;
                }
            }
        });
    });
};

// Xuất khẩu các hàm để Controller (Chat, Rent) có thể lấy ra dùng
const getIo = () => {
    if (!io) throw new Error("Socket.io chưa được khởi tạo!");
    return io;
};

const getOnlineUsers = () => onlineUsers;

module.exports = { initSocket, getIo, getOnlineUsers };