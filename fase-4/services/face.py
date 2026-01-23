
import cv2

def detect_face_in_webcam():   
    video_capture = cv2.VideoCapture(0)

    if not video_capture.isOpened():
        print("Erro: Nenhuma imagem de rosto encontrada na pasta 'images'.")
        print("Certifique-se de que existem imagens .jpg ou .png na pasta.")
        return
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    try:
    
        while True:
            ret, frame = video_capture.read()
            if not ret:
                print("Falha ao capturar o vídeo")
                break

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=6,
                minSize=(30, 30),
            )

            for (x, y, w, h) in faces:
                
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            cv2.imshow('Face detection', frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    except KeyboardInterrupt:
        print("Interrompido pelo usuário.")
        pass
    finally:
        video_capture.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    detect_face_in_webcam()