// Pipeline de Jenkins: cada vez que lo ejecutas, construye la imagen de la API
// y la despliega en esta misma EC2 conectada a RDS.
//
// Requisito en Jenkins: una credencial de tipo "Secret file" con ID "env-prod".
// Ese archivo es el .env de producción (DB_HOST = endpoint de RDS, DB_SSL=true...).
// Así las contraseñas viven en Jenkins y NUNCA en el repositorio.
pipeline {
    // "any": ejecuta el pipeline en cualquier agente disponible (aquí, el propio Jenkins)
    agent any

    stages {
        stage('Descargar código') {
            steps {
                // Trae el código del repositorio configurado en el job
                checkout scm
            }
        }

        stage('Construir y desplegar') {
            steps {
                // Entrega el archivo secreto como la ruta temporal ENV_FILE
                withCredentials([file(credentialsId: 'env-prod', variable: 'ENV_FILE')]) {
                    sh '''
                        # Copia el .env de producción al proyecto
                        cp "$ENV_FILE" .env
                        # --build: construye la imagen nueva con el código actual
                        # -d: en segundo plano
                        # --wait: espera a que /health responda; si falla, este paso falla
                        docker compose -f docker-compose.prod.yml up -d --build --wait
                    '''
                }
            }
        }

        stage('Verificar') {
            steps {
                // Muestra el estado final del contenedor (debe decir "healthy")
                sh 'docker compose -f docker-compose.prod.yml ps'
            }
        }
    }

    post {
        failure {
            // Si algo falló, muestra los últimos logs de la API para saber por qué.
            // Necesita el .env presente, por eso la limpieza va después, en "cleanup".
            sh 'docker compose -f docker-compose.prod.yml logs --tail=50 app || true'
        }
        cleanup {
            // "cleanup" se ejecuta siempre y AL FINAL, después de todos los demás bloques.
            // Borra el .env del espacio de trabajo para no dejar contraseñas en disco.
            sh 'rm -f .env'
        }
    }
}
