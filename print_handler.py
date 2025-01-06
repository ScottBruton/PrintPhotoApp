import win32print
import win32api
import sys
import json
import os

class PrintHandler:
    @staticmethod
    def is_virtual_printer(printer_name):
        virtual_printers = [
            "Microsoft Print to PDF",
            "Microsoft XPS Document Writer",
            "OneNote",
            "OneNote for Windows 10",
            "Fax",
            "Adobe PDF",
            "PDFCreator",
            "PDF24",
            "Foxit Reader PDF Printer",
            "Microsoft OneNote"
        ]
        return any(vp.lower() in printer_name.lower() for vp in virtual_printers)

    @staticmethod
    def get_printers():
        printers = []
        try:
            for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS):
                # Only add the printer if it's not a virtual printer
                if not PrintHandler.is_virtual_printer(printer[2]):
                    # Get detailed printer info
                    h_printer = win32print.OpenPrinter(printer[2])
                    try:
                        printer_info = win32print.GetPrinter(h_printer, 2)  # Level 2 gives us detailed info
                        status = printer_info['Status']
                        
                        printer_data = {
                            'name': printer[2],
                            'isDefault': printer[2] == win32print.GetDefaultPrinter(),
                            'status': status,
                            'attributes': printer_info.get('Attributes', 0)
                        }
                        printers.append(printer_data)
                    finally:
                        win32print.ClosePrinter(h_printer)
                        
            return json.dumps({'success': True, 'printers': printers})
        except Exception as e:
            return json.dumps({'success': False, 'error': str(e)})

    @staticmethod
    def set_default_printer(printer_name):
        try:
            win32print.SetDefaultPrinter(printer_name)
            return json.dumps({'success': True})
        except Exception as e:
            return json.dumps({'success': False, 'error': str(e)})

    @staticmethod
    def print_file(file_path, printer_name):
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            # Set the printer
            if printer_name:
                win32print.SetDefaultPrinter(printer_name)

            # Print the file
            win32api.ShellExecute(
                0,
                "print",
                file_path,
                None,
                ".",
                0
            )
            return json.dumps({'success': True})
        except Exception as e:
            return json.dumps({'success': False, 'error': str(e)})

if __name__ == "__main__":
    handler = PrintHandler()
    
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No command provided'}))
        sys.exit(1)

    command = sys.argv[1]
    
    if command == "get_printers":
        print(handler.get_printers())
    elif command == "set_default":
        if len(sys.argv) < 3:
            print(json.dumps({'success': False, 'error': 'No printer name provided'}))
            sys.exit(1)
        print(handler.set_default_printer(sys.argv[2]))
    elif command == "print":
        if len(sys.argv) < 4:
            print(json.dumps({'success': False, 'error': 'Missing file path or printer name'}))
            sys.exit(1)
        print(handler.print_file(sys.argv[2], sys.argv[3]))
    else:
        print(json.dumps({'success': False, 'error': 'Invalid command'})) 