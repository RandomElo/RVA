docker compose up -d --build
docker ps
docker compose up -d --build backend
docker compose logs -f backend
ssh -i $HOME\.ssh\rva -p 2222 -L 9000:localhost:8888 debian@rva.smce.ovh