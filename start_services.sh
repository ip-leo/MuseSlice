

echo "Cleaning up existing ports"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5002 | xargs kill -9 2>/dev/null || true


echo "Starting backend: 5002"
cd audio_service
python3 app.py &
BACKEND_PID=$!
cd ..

sleep 3


if curl -s http://localhost:5002/app-check > /dev/null; then
    echo "Backend is running: 5002"
else
    echo "Backend failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi


echo "Starting frontend: 3000"
npm run dev &
FRONTEND_PID=$!

echo "Services started"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

wait
