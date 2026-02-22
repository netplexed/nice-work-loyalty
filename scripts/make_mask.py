from PIL import Image, ImageDraw
import sys

def create_mask(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    
    # Get image data
    width, height = img.size
    
    # Do a flood fill from 0,0 (assuming top-left is background)
    ImageDraw.floodfill(img, (0, 0), (255, 255, 255, 0), thresh=50) # Replace white with transparent
    
    # Also fill from other corners just in case 
    ImageDraw.floodfill(img, (width-1, 0), (255, 255, 255, 0), thresh=50)
    ImageDraw.floodfill(img, (0, height-1), (255, 255, 255, 0), thresh=50)
    ImageDraw.floodfill(img, (width-1, height-1), (255, 255, 255, 0), thresh=50)
    
    # Now we need to make everything inside the shape opaque (so it masks out)
    # The gradient should only show inside the character
    
    # Let's create an alpha channel for the mask
    # What is not (255,255,255,0) is part of the character
    # We want the mask to be fully opaque where the character is, and transparent outside.
    # So we want to copy the newly flooded image to output
    
    # Oh wait, we just want to create a mask. The character inside has a white background originally
    # and black lines. After floodfill, the outside is transparent, inside is still white/black lines.
    # The CSS `mask-image` uses the alpha channel of the image for masking.
    # So wherever the image is transparent (from our flood-fill), the mask will hide the gradient!
    # Where the image is opaque (the inside white, the inside black lines), the mask will show the gradient!
    # This is perfect.
    
    img.save(output_path, "PNG")

if __name__ == "__main__":
    create_mask(sys.argv[1], sys.argv[2])
