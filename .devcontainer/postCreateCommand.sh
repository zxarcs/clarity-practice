curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash - &&\
sudo apt-get install -y nodejs &&\
wget -nv https://github.com/hirosystems/clarinet/releases/download/v2.1.0/clarinet-linux-x64-glibc.tar.gz -O clarinet-linux-x64.tar.gz &&\
tar -xf clarinet-linux-x64.tar.gz &&\
chmod +x ./clarinet &&\
sudo mv ./clarinet /usr/local/bin &&\
rm clarinet-linux-x64.tar.gz