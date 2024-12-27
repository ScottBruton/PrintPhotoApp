class Command {
    execute() {}
    undo() {}
}

class AddPhotoCommand extends Command {
    constructor(editor, placeholder, imageData) {
        super();
        this.editor = editor;
        this.placeholder = placeholder;
        this.imageData = imageData;
        this.oldImageData = placeholder.innerHTML;
    }

    execute() {
        const img = document.createElement('img');
        img.src = this.imageData;
        this.placeholder.innerHTML = '';
        this.placeholder.appendChild(img);
    }

    undo() {
        this.placeholder.innerHTML = this.oldImageData;
    }
}

class RotateImageCommand extends Command {
    constructor(editor, image, angle) {
        super();
        this.editor = editor;
        this.image = image;
        this.angle = angle;
        this.previousAngle = image.style.transform || 'rotate(0deg)';
    }

    execute() {
        const currentAngle = parseInt(this.previousAngle.match(/\d+/)) || 0;
        const newAngle = currentAngle + this.angle;
        this.image.style.transform = `rotate(${newAngle}deg)`;
    }

    undo() {
        this.image.style.transform = this.previousAngle;
    }
} 