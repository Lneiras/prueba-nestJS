# Imagen de Jenkins con el cliente de Docker instalado.
# Así Jenkins (que corre dentro de un contenedor) puede ejecutar comandos "docker" y
# "docker compose" para construir y desplegar la API en la misma EC2.
FROM jenkins/jenkins:lts-jdk21

# Instalar paquetes requiere permisos de administrador
USER root

# Agrega el repositorio oficial de Docker e instala SOLO el cliente (docker-ce-cli)
# y el plugin de compose. El servidor de Docker es el de la EC2, no se instala aquí.
RUN apt-get update && apt-get install -y lsb-release ca-certificates curl && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y docker-ce-cli docker-compose-plugin && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Volvemos al usuario normal de Jenkins
USER jenkins
