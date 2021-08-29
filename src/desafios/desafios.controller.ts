import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DesafiosService } from './desafios.service';
import { AtribuirDesafioPartidaDto } from './dtos/atribuir-desafio-partida.dto';
import { AtualizarDesafioDto } from './dtos/atualizar-desafio.dtos';
import { CriarDesafioDto } from './dtos/criar-desafio.dtos';
import { Desafio } from './interface/desafio.interface';
import { DesafioStatusValidacaoPipe } from './pipes/desafio-status-validation.pipe';

@Controller('api/v1/desafios')
export class DesafiosController {
  private readonly logger = new Logger(DesafiosController.name);

  constructor(private readonly desafiosService: DesafiosService) {}

  @Post()
  @UsePipes(ValidationPipe)
  async criarDesafio(
    @Body() criarDesafioDto: CriarDesafioDto,
  ): Promise<Desafio> {
    this.logger.log(`criarDesafioDto: ${JSON.stringify(criarDesafioDto)}`);

    return await this.desafiosService.criarDesafio(criarDesafioDto);
  }

  @Get()
  async consultarDesafios(
    @Query('idJogador') _id: string,
  ): Promise<Array<Desafio>> {
    return _id
      ? await this.desafiosService.consultarDesafiosDeUmJogador(_id)
      : await this.desafiosService.consultarTodosDesafios();
  }

  @Put('/:desafio')
  async atualizarDesafio(
    @Body(DesafioStatusValidacaoPipe) atualizarDesafioDto: AtualizarDesafioDto,
    @Param('desafio') _id: string,
  ): Promise<void> {
    await this.desafiosService.atualizarDesafio(_id, atualizarDesafioDto);
  }

  @Delete('/:desafio')
  async deletarDesafio(@Param('desafio') _id: string): Promise<void> {
    await this.desafiosService.deletarDesafio(_id);
  }

  @Post('/:desafio/partida/')
  async atribuirDesafioPartida(
    @Body(ValidationPipe) atribuirDesafioPartidaDto: AtribuirDesafioPartidaDto,
    @Param('desafio') _id: string,
  ): Promise<void> {
    await this.desafiosService.atribuirDesafioPartida(
      _id,
      atribuirDesafioPartidaDto,
    );
  }
}
